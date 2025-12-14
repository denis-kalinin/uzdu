[Git-flow](https://startracex.github.io/semantic-release/recipes/release-workflow/maintenance-releases.html)

## Main Branches
- **main (or master) Branch:**
  - The production-ready code.
  - Only contains thoroughly tested and stable code.
  - Direct commits are restricted; only allowed through pull requests (PRs) after code review and approval.

- **develop Branch:**
  - The latest codebase reflecting the current state of development.
  - All features and fixes are integrated into this branch before being merged into main.
  - Serves as a base for all new feature branches.

- **Supporting Branches**
  - Feature Branches:
    - **Naming Convention:** <code>feature/&lt;feature-name&gt;</code>
    - Created from: develop
    - **Purpose:** For developing new features or enhancements.
    - **Merging:** Once complete and tested, merge back into develop.

  - Bugfix Branches:
    - **Naming Convention:** <code>bugfix/&lt;issue-id&gt;</code>
    - **Created from:** develop (or release if the fix is for an upcoming release)
    - **Purpose:** For fixing bugs identified during development.
    - **Merging:** Merge back into develop (or release if applicable) once fixed.

  - Release Branches:
    - **Naming Convention:** <code>release/&lt;version-number&gt;</code>
    - **Created from:** develop
    - **Purpose:** To prepare for a new production release.
    - **Activities:** Final testing, bug fixing, and preparing release notes.
    - **Merging:** Merge into both main and develop once ready.

  - Hotfix Branches:
    - **Naming Convention:** <code>hotfix/&lt;issue-id&gt;</code>
    - **Created from:** main
    - **Purpose:** For urgent fixes that need to go directly into production.
    - **Merging:** Merge into both main and develop once applied.

## Branch Workflow
1. Feature Development:
    - Create a branch from develop using <code>feature/&lt;feature-name&gt;</code>.
    - Implement the feature, commit changes, and push the branch to the repository.
    - Open a pull request to merge the feature branch into develop.
    - Conduct code reviews, perform necessary tests, and merge the changes into develop.

2. Bug Fixing:
    - Create a branch from develop using <code>bugfix/&lt;issue-id&gt;</code>.
    - Fix the bug, commit changes, and push the branch.
    - Open a pull request to merge the bugfix branch into develop.
    - After reviews and tests, merge the changes into develop.

3. Release Preparation:
    - Create a branch from develop using <code>release/&lt;version-number&gt;</code>.
    - Perform final testing, fix any last-minute bugs, and update documentation.
    - Merge the release branch into both main and develop once ready.

4. Hotfixes:
    - Create a branch from main using <code>hotfix/&lt;issue-id&gt;</code>.
    - Apply the fix, commit changes, and push the branch.
    - Open a pull request to merge the hotfix branch into main.
    - Merge changes into develop to include the fix in ongoing development.