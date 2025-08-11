# Contributing

Thank you for your interest in contributing to Petra Vault! Please refer to the guidelines to get started.

## Overview

These guidelines are intended to help you get started with the project. By following these guidelines, you will be able to understand how to contribute to the project while maintaining the project's security and quality standards. If you would like to contribute, you can visit the [Github Issues](https://github.com/aptos-labs/petra-vault/issues) page to find issues you can help with.

> [!IMPORTANT]
> If you are looking to add a new feature, please make sure to open an issue first to discuss the feature with the maintainers. Doing so will help avoid rejected/declined pull requests, and ensure that your time is spent on the most relevant work.

## 1. Cloning the Repository

To clone the repository, you can use the following command on your local machine:

```bash
git clone https://github.com/aptos-labs/petra-vault.git
```

## 2. Installing Runtimes

Petra Vault uses [pnpm](https://pnpm.io/) as its package manager and [Node.js](https://nodejs.org/) as its JavaScript runtime.

It's important to use the correct runtime versions to avoid any issues. The versions are specified in the [`.tool-versions`](../.tool-versions) file to ensure consistency across all developers.

To check your runtime versions, you can use the following command:

```bash
node -v
pnpm -v
```

If the runtime versions do not align with the versions defined in the [`.tool-versions`](../.tool-versions) file, we recommend that you install the correct runtimes using [mise](https://mise.jdx.dev/), which helps manage multiple versions of development tools.

## 3. Installing Dependencies

Once your runtimes are installed, you can install the project's dependencies through pnpm using the following command:

```bash
pnpm install
```

If you encounter any issues during installation:

- Try deleting the `node_modules` directory
- Run `pnpm install` again
- Check if your runtime versions are correct

## 4. Setting Up Environment Variables

Some subdirectories may contain an `.env.example` file. These files are templates that you can use to create your own `.env` file.

To create your own `.env` file, you can use the following command:

```bash
cp .env.example .env
```

This will create a new `.env` file in the directory with the correct environment variable names. Once you have created the `.env` file, make sure to fill in the correct values for the environment variables. For example, here is the `.env.example` file in the `apps/web` directory:

```bash
# .env.example

NEXT_PUBLIC_ENABLE_REACT_SCAN=0

# Obtain from: https://developers.aptos.dev
NEXT_PUBLIC_APTOS_MAINNET_API_KEY=<api_key>
NEXT_PUBLIC_APTOS_TESTNET_API_KEY=<api_key>

# Obtain from: https://analytics.google.com
NEXT_PUBLIC_GA4_ID=<ga4_id>

CI=false
```

It is important to set these up to avoid any issues such as rate limiting or missing functionality. If you don't have access to certain API keys, please obtain them using the links provided in the `.env.example` file.

## 5. Running Development Servers

To run the development servers, you can use the following command:

```bash
pnpm dev
```

If you need to run the development servers for a specific project, you can use the `--filter` flag:

```bash
pnpm dev --filter <web|other-project-name>
```

Alternatively, you can run the development servers directly from the projects:

```bash
cd apps/web
pnpm dev
```

Development servers will automatically update as changes are made to the codebase and in their respective directories.

## 6. Running Tests

Petra Vault uses [Vitest](https://vitest.dev/) for unit testing and [Playwright](https://playwright.dev/) for end-to-end testing.

- **Vitest** is used for testing individual components and functions
- **Playwright** is used for testing complete user flows in a real browser environment

It's important that you have set up all environment variables before running the tests. Make sure to find the `.env.example` file in all projects in `apps/` and create their corresponding `.env` file.

Now that you have set up the environment variables, you can run the tests using the following command from the root directory:

- **Unit Tests:** `pnpm test`
- **End-to-End Tests:** `pnpm test:e2e`

When adding new features and flows, it's important to create tests that thoroughly cover the new functionality. This helps ensure that:

1. Your code works as expected
2. Future changes don't break existing functionality
3. Other developers can understand how your code should behave

## 7. Developer Configurations

Petra Vault uses [Prettier](https://prettier.io/) for formatting and [ESLint](https://eslint.org/) for linting.

- **Prettier** automatically formats your code to maintain consistent style
- **ESLint** helps catch potential errors and enforce coding standards

You can run these tools using:

- **Prettier:** `pnpm format`
- **ESLint:** `pnpm lint`

In addition, to edit configurations we've centralized them into subpackages.

- **tsconfig:** `packages/eslint-config` - TypeScript configuration
- **eslint:** `packages/typescript-config` - ESLint rules and settings

When making changes to the configurations, it's best to make changes to child configurations rather than root configurations, as this ensures that changes are reflected in relevant projects without conflicts.

## 8. Documentation

The project's user-facing documentation is currently being handled through a closed-source repository. To make modifications to the documentation, please coordinate with a maintainer using a [Github Issue](https://github.com/aptos-labs/petra-vault/issues).

## 9. Ecosystem Apps

Ecosystem apps are a collection of whitelisted apps that can be embedded in Petra Vault iframes. This list is currently managed through a closed-source repository. To add a new ecosystem app, please make a request using a [Github Issue](https://github.com/aptos-labs/petra-vault/issues).

## 10. Submitting a Pull Request

When you submit a pull request, GitHub will automatically run checks and tests against your changes. If any of the checks fail:

1. Review the test logs to identify the cause of the failure
2. Fix the issues in your code
3. Push the changes to your branch
4. The checks will automatically re-run

Please ensure all checks pass before requesting a review.

## 11. That's it!

You're all set! If you have any questions, please reach out to a maintainer using a [Github Issue](https://github.com/aptos-labs/petra-vault/issues). We're here to help!
