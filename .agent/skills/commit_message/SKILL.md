---
description: Generate a conventional commit message based on staged changes.
---

# Commit Message Generation Skill

This skill allows you to generate a conventional commit message for the currently staged changes.

## Steps

1.  **Analyze Staged Changes**
    - Execute `git diff --cached` to get the diff of staged files.
    - Check the `git log` if needed to get the context of the changes.
    - If no files are staged, inform the user and ask them to stage files.
    - Do not read package lock files such as pnpm-lock.yaml, package-lock.json etc.

2.  **Determine Scope**
    - Read `.vscode/settings.json` and look for `conventionalCommits.scopes`.
    - Select the most appropriate scope from the list based on the modified files.

3.  **Select Commit Type**
    - Determine the type of change based on the diff:
        - `feat`: A new feature
        - `fix`: A bug fix
        - `docs`: Documentation only changes
        - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
        - `refactor`: A code change that neither fixes a bug nor adds a feature
        - `perf`: A code change that improves performance
        - `test`: Adding missing tests or correcting existing tests
        - `build`: Changes that affect the build system or external dependencies
        - `ci`: Changes to our CI configuration files and scripts
        - `chore`: Other changes that don't modify src or test files
        - `revert`: Reverts a previous commit

4.  **Draft Commit Message**
    - **Structure**:
        ```
        <type>(<scope>): <title>

        [optional body]

        [optional footer]
        ```
    - **Title**:
        - Format: `<type>(<scope>): <title>`
        - Example: `feat(auth): add login via google`
        - Keep under 72 characters. More description can go in body
        - Use imperative mood (e.g., "add" not "added").
    - **Body** (Optional):
        - Include if the change needs explanation (what and why).
        - Wrap at 72 characters.
        - Should be separated from header and footer by at least 1 empty line, i.e., 2 new lines.
    - **Footer** (Optional):
        - Use for breaking changes (start with `BREAKING CHANGE:`) or closing issues (e.g., `Closes #123`).

5.  **Output**
    - Present the generated commit message to the user for review.

