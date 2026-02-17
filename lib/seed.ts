import { ID } from 'react-native-appwrite';
import { appwriteConfig, databases, storage } from './appwrite';
import dummyData from './data';

interface Category {
	name: string;
	description: string;
}

interface Customization {
	name: string;
	price: number;
	type: 'topping' | 'side' | 'size' | 'crust' | string; // extend as needed
}

interface MenuItem {
	name: string;
	description: string;
	image_url: string;
	price: number;
	rating: number;
	calories: number;
	protein: number;
	category_name: string;
	customizations: string[]; // list of customization names
}

interface DummyData {
	categories: Category[];
	customizations: Customization[];
	menu: MenuItem[];
}

// ensure dummyData has correct shape
const data = dummyData as DummyData;

async function clearAll(collectionId: string): Promise<void> {
	const list = await databases.listDocuments({
		databaseId: appwriteConfig.databaseId,
		collectionId,
	});

	await Promise.all(
		list.documents.map((doc) =>
			databases.deleteDocument({
				databaseId: appwriteConfig.databaseId,
				collectionId,
				documentId: doc.$id,
			}),
		),
	);
}

async function clearStorage(): Promise<void> {
	const list = await storage.listFiles({
		bucketId: appwriteConfig.bucketId,
	});

	await Promise.all(
		list.files.map((file) =>
			storage.deleteFile({
				bucketId: appwriteConfig.bucketId,
				fileId: file.$id,
			}),
		),
	);
}

async function uploadImageToStorage(imageUrl: string) {
	try {
		console.log(`[Seed] Fetching image: ${imageUrl}`);
		const response = await fetch(imageUrl);
		const blob = await response.blob();

		const fileObj = {
			name: imageUrl.split('/').pop() || `file-${Date.now()}.jpg`,
			type: blob.type || 'image/jpeg',
			size: blob.size,
			uri: imageUrl,
		};

		console.log(`[Seed] Attempting to upload to Appwrite storage...`);
		const file = await storage.createFile({
			bucketId: appwriteConfig.bucketId,
			fileId: ID.unique(),
			file: fileObj as any,
		});

		console.log(`[Seed] File uploaded successfully, ID: ${file.$id}`);
		return storage.getFileViewURL(appwriteConfig.bucketId, file.$id);
	} catch (error) {
		console.warn(
			`[Seed] Storage upload failed for ${imageUrl}. Using remote URL as fallback.`,
		);
		// Si falla la subida al Storage (común en RN con URLs remotas),
		// devolvemos la URL original para que el seed no se detenga.
		return imageUrl;
	}
}

async function seed(): Promise<void> {
	try {
		// 1. Clear all
		console.log('[Seed] Clearing existing data...');
		await clearAll(appwriteConfig.categoriesCollectionId);
		await clearAll(appwriteConfig.customizationsCollectionId);
		await clearAll(appwriteConfig.menuCollectionId);
		await clearAll(appwriteConfig.menuCustomizationsCollectionId);
		await clearStorage();

		// 2. Create Categories
		console.log('[Seed] Creating categories...');
		const categoryMap: Record<string, string> = {};
		for (const cat of data.categories) {
			const doc = await databases.createDocument({
				databaseId: appwriteConfig.databaseId,
				collectionId: appwriteConfig.categoriesCollectionId,
				documentId: ID.unique(),
				data: cat,
			});
			categoryMap[cat.name] = doc.$id;
		}

		// 3. Create Customizations
		console.log('[Seed] Creating customizations...');
		const customizationMap: Record<string, string> = {};
		for (const cus of data.customizations) {
			const doc = await databases.createDocument({
				databaseId: appwriteConfig.databaseId,
				collectionId: appwriteConfig.customizationsCollectionId,
				documentId: ID.unique(),
				data: {
					name: cus.name,
					price: cus.price,
					type: cus.type,
				},
			});
			customizationMap[cus.name] = doc.$id;
		}

		// 4. Create Menu Items
		console.log('[Seed] Creating menu items...');
		const menuMap: Record<string, string> = {};
		for (const item of data.menu) {
			console.log(`[Seed] Processing menu item: ${item.name}`);
			const uploadedImage = await uploadImageToStorage(item.image_url);

			console.log(`[Seed] Creating document for ${item.name}...`);
			const doc = await databases.createDocument({
				databaseId: appwriteConfig.databaseId,
				collectionId: appwriteConfig.menuCollectionId,
				documentId: ID.unique(),
				data: {
					name: item.name,
					description: item.description,
					image_url: uploadedImage,
					price: item.price,
					rating: item.rating,
					calories: item.calories,
					protein: item.protein,
					categories: categoryMap[item.category_name],
				},
			});

			menuMap[item.name] = doc.$id;

			// 5. Create menu_customizations
			console.log(`[Seed] Linking customizations for ${item.name}...`);
			for (const cusName of item.customizations) {
				await databases.createDocument({
					databaseId: appwriteConfig.databaseId,
					collectionId: appwriteConfig.menuCustomizationsCollectionId,
					documentId: ID.unique(),
					data: {
						menu: doc.$id,
						customizations: customizationMap[cusName],
					},
				});
			}
		}

		console.log('✅ Seeding complete.');
	} catch (error) {
		console.error('[Seed] Error during seeding process:', error);
		throw error;
	}
}

export default seed;
