# Resume source

This folder holds the LaTeX source for the resume that appears on the site.
On every push that changes anything in `resume/`, a GitHub Action
(`.github/workflows/build-resume.yml`) compiles it and publishes the result to
`resume/resume.pdf` (with a cache-busting `?v=` stamp on the links).

## One-time setup: bring your Overleaf source in

Overleaf's free tier has no Git/API, so you copy the source over once, then edit
it here from now on (VS Code, etc.).

1. In Overleaf: **Menu → Download → Source** to get a `.zip` of the whole project.
2. Unzip it and drop **all** the files into this `resume/` folder — the main
   `.tex`, plus any `.cls` / `.sty`, fonts, and images it uses.
3. Rename the main file to **`resume.tex`** (or, if you'd rather keep its name,
   edit `root_file:` in `.github/workflows/build-resume.yml` to match).
4. Commit and push. The Action builds the PDF and commits it back automatically.

## If the build fails

The default LaTeX engine is `pdflatex` (via `latexmk`). If your template uses
custom fonts via `fontspec` (very common in modern resume templates), it needs
**XeLaTeX** or **LuaLaTeX** instead — uncomment the matching line under
`Compile resume LaTeX` in the workflow:

```yaml
# latexmk_use_xelatex: true
# latexmk_use_lualatex: true
```

Check the **Actions** tab on GitHub for the compile log if something breaks.

## Editing / previewing locally (optional)

You don't need a local LaTeX install — the Action builds it for you. But if you
want a local preview:

- **TeX Live (Linux):** `sudo apt install texlive-full` then
  `cd resume && latexmk -pdf resume.tex` (add `-xelatex` or `-lualatex` to match
  the workflow engine).
- **VS Code:** the *LaTeX Workshop* extension gives live preview on save.

## Triggering a rebuild without changing source

Go to the repo's **Actions → Build resume PDF → Run workflow** (manual dispatch).
