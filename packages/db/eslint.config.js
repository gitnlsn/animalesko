import { baseConfig } from "@animalesko/config/eslint/base";

export default [...baseConfig, { ignores: ["src/generated/**", "prisma/migrations/**"] }];
