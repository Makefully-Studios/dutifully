# Publishing `@makefully/dutifully`

This package uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC) from GitHub Actions. No long-lived `NPM_TOKEN` secret is required.

## Release process

1. Bump `version` in `package.json` and `package-lock.json`.
2. Update `CHANGELOG.md`.
3. Commit and push to `main`.

The [publish workflow](.github/workflows/publish.yml) runs when `package.json` or `package-lock.json` changes on `main`. It publishes automatically when the version is higher than what is already on npm.

### Manual publish

Run **Actions → Publish to npm → Run workflow** to publish the current `package.json` version if it is not already on npm.

## Requirements

- npm CLI **11.5.1+** for trusted publishing (workflow uses `npx npm@11.8.0` — avoid `npm install -g npm@latest` on GHA runners; it can break the bundled npm with `MODULE_NOT_FOUND`)
- `setup-node` must set `registry-url: https://registry.npmjs.org` so OIDC auth is wired correctly
- `package.json` `repository.url` must match the GitHub repo (`https://github.com/Makefully-Studios/dutifully.git`)
- Your npm account must be an owner or member of the `@makefully` organization with publish access
