import { FlatCompat } from "@eslint/compat";

const compat = new FlatCompat();

const eslintConfig = [...compat.extends("next/core-web-vitals")];

export default eslintConfig;
