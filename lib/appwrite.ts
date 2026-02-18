import { CreateUserParams, GetMenuParams, SignInParams, User } from '@/type';
import { Account, Avatars, Client, Databases, ID, Query, Storage } from 'react-native-appwrite';

export const appwriteConfig = {
	endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
	platform: 'com.jsm.foodordering',
	projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
	databaseId: '6990dd04000f4642748e',
	bucketId: '6994e12b001fccabcf44',
	userCollectionId: 'user',
	categoriesCollectionId: 'categories',
	menuCollectionId: 'menu',
	customizationsCollectionId: 'customizations',
	menuCustomizationsCollectionId: 'menu_customizations',
};

export const client = new Client();

client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId).setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const avatars = new Avatars(client);
export const storage = new Storage(client);

export const createUser = async ({ email, password, name }: CreateUserParams) => {
	try {
		const newAcccount = await account.create({
			userId: ID.unique(),
			email,
			password,
			name,
		});

		if (!newAcccount) throw Error;

		await signIn({ email, password });
		const avatarUrl = avatars.getInitialsURL(name);

		const newUser = await databases.createDocument({
			databaseId: appwriteConfig.databaseId,
			collectionId: appwriteConfig.userCollectionId,
			documentId: ID.unique(),
			data: {
				accountId: newAcccount.$id,
				email,
				name,
				avatar: avatarUrl,
			},
		});

		return newUser;
	} catch (error) {
		throw new Error(error as string);
	}
};

export const signIn = async ({ email, password }: SignInParams) => {
	try {
		const session = await account.createEmailPasswordSession({
			email,
			password,
		});
	} catch (error) {
		throw new Error(error as string);
	}
};

export const getCurrentUser = async () => {
	try {
		const currentAccount = await account.get();
		if (!currentAccount) throw Error;
		const currentUser = await databases.listDocuments<User>({
			databaseId: appwriteConfig.databaseId,
			collectionId: appwriteConfig.userCollectionId,
			queries: [Query.equal('accountId', currentAccount.$id)],
		});

		if (!currentUser) throw Error;

		return currentUser.documents[0];
	} catch (error) {
		console.log(error);
		throw new Error(error as string);
	}
};

export const getMenu = async ({ category, query }: GetMenuParams) => {
	try {
		const queries: string[] = [];

		if (category) queries.push(Query.equal('categories', category));
		if (query) queries.push(Query.search('name', query));

		const menus = await databases.listDocuments({
			databaseId: appwriteConfig.databaseId,
			collectionId: appwriteConfig.menuCollectionId,
			queries: queries,
		});

		return menus.documents;
	} catch (error) {
		throw new Error(error as string);
	}
};

export const getCategories = async () => {
	try {
		const categories = await databases.listDocuments({
			databaseId: appwriteConfig.databaseId,
			collectionId: appwriteConfig.categoriesCollectionId,
		});

		return categories.documents;
	} catch (error) {
		throw new Error(error as string);
	}
};
