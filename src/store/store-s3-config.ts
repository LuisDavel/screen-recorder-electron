import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface S3Config {
	isEnabled: boolean;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	bucketName: string;
	folderPrefix?: string; // Optional prefix for organizing files
	isConfigured: boolean;
}

interface S3ConfigState {
	config: S3Config;
	setEnabled: (enabled: boolean) => void;
	setCredentials: (accessKeyId: string, secretAccessKey: string) => void;
	setRegion: (region: string) => void;
	setBucketName: (bucketName: string) => void;
	setFolderPrefix: (prefix: string) => void;
	isValidConfig: () => boolean;
	resetConfig: () => void;
}

const defaultConfig: S3Config = {
	isEnabled: false,
	accessKeyId: "",
	secretAccessKey: "",
	region: "us-east-1",
	bucketName: "",
	folderPrefix: "recordings",
	isConfigured: false,
};

export const useS3ConfigStore = create<S3ConfigState>()(
	persist(
		(set, get) => ({
			config: defaultConfig,

			setEnabled: (enabled: boolean) => {
				set((state) => ({
					config: {
						...state.config,
						isEnabled: enabled,
					},
				}));
			},

			setCredentials: (accessKeyId: string, secretAccessKey: string) => {
				set((state) => {
					const newConfig = {
						...state.config,
						accessKeyId,
						secretAccessKey,
					};
					return {
						config: {
							...newConfig,
							isConfigured: validateConfig(newConfig),
						},
					};
				});
			},

			setRegion: (region: string) => {
				set((state) => {
					const newConfig = {
						...state.config,
						region,
					};
					return {
						config: {
							...newConfig,
							isConfigured: validateConfig(newConfig),
						},
					};
				});
			},

			setBucketName: (bucketName: string) => {
				set((state) => {
					const newConfig = {
						...state.config,
						bucketName,
					};
					return {
						config: {
							...newConfig,
							isConfigured: validateConfig(newConfig),
						},
					};
				});
			},

			setFolderPrefix: (prefix: string) => {
				set((state) => ({
					config: {
						...state.config,
						folderPrefix: prefix,
					},
				}));
			},

			isValidConfig: () => {
				return validateConfig(get().config);
			},

			resetConfig: () => {
				set({ config: defaultConfig });
			},
		}),
		{
			name: "s3-config-storage",
			version: 1,
		},
	),
);

function validateConfig(config: S3Config): boolean {
	return !!(
		config.accessKeyId &&
		config.secretAccessKey &&
		config.region &&
		config.bucketName
	);
}

export type { S3ConfigState };
