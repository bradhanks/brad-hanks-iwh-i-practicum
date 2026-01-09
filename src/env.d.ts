declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ACCESS_TOKEN: string;
            CUSTOM_OBJECT_TYPE: string;
            NODE_ENV?: 'development' | 'production' | 'test';
        }
    }
}

export {};
