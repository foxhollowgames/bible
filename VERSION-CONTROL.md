# Project versions and two-computer use

This project started using Git on September 29, 2026. The first commit preserves the files available on that date. No earlier Git history or backup archives were found in the project folder. Earlier edits cannot be recovered from this commit.

The repository includes the application, study content, local assets, source data, scripts, and existing validation images. Git does not include Codex conversations or browser storage.

## Set up another computer

1. Install Git and Node.js.
2. Sign in to GitHub with an account that can access the private repository.
3. Clone `https://github.com/foxhollowgames/bible-wayfinder.git` with GitHub Desktop or Git.
4. Open the cloned folder as a project in Codex.
5. On Windows, double-click `Start Bible Wayfinder.cmd` to run the guide.

## Switch computers

Before editing, download the latest committed changes:

```text
git pull --ff-only
```

After editing, save and upload your changes:

```text
git add .
git commit -m "Describe the changes"
git push
```

Uploads are not automatic. Finish the upload before switching computers. If Git reports conflicting changes, resolve them before continuing. Do not overwrite the other computer's work.
