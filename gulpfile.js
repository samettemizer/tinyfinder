'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { parallel, watch: gulpWatch } = require('gulp');
const CleanCSS = require('clean-css');
const { minify: minifyJs } = require('terser');

const projectRoot = __dirname;
const assetsDir = path.join(projectRoot, 'assets');
const scriptsDir = path.join(assetsDir, 'scripts');
const stylesDir = path.join(assetsDir, 'styles');

const outputFiles = {
    cssUncompressed: path.join(assetsDir, 'tinyfinder.uncompressed.css'),
    cssMinified: path.join(assetsDir, 'tinyfinder.min.css'),
    jsUncompressed: path.join(assetsDir, 'tinyfinder.uncompressed.js'),
    jsMinified: path.join(assetsDir, 'tinyfinder.min.js'),
};

function sortByFilename(a, b) {
    return path.basename(a).localeCompare(path.basename(b), 'en', {
        numeric: true,
        sensitivity: 'base',
    });
}

async function getOrderedFiles(directory, extension) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => path.join(directory, entry.name))
        .sort(sortByFilename);
}

async function readFilesWithBanner(files, commentType) {
    const chunks = [];

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const relativeName = path.relative(projectRoot, file).replaceAll(path.sep, '/');

        if (commentType === 'css') {
            chunks.push(`/* ${relativeName} */\n${content.trimEnd()}`);
        } else {
            chunks.push(`/* ${relativeName} */\n;\n${content.trimEnd()}`);
        }
    }

    return `${chunks.join('\n\n')}\n`;
}

async function buildCss() {
    const files = await getOrderedFiles(stylesDir, '.css');
    const combinedCss = await readFilesWithBanner(files, 'css');

    await fs.writeFile(outputFiles.cssUncompressed, combinedCss, 'utf8');

    const minified = new CleanCSS({
        level: 2,
        rebase: false,
    }).minify(combinedCss);

    if (minified.errors.length > 0) {
        await fs.rm(outputFiles.cssUncompressed, { force: true });
        throw new Error(`CSS minify failed:\n${minified.errors.join('\n')}`);
    }

    if (minified.warnings.length > 0) {
        console.warn(`CSS minify warnings:\n${minified.warnings.join('\n')}`);
    }

    await fs.writeFile(outputFiles.cssMinified, `${minified.styles}\n`, 'utf8');
    await fs.rm(outputFiles.cssUncompressed, { force: true });
}

async function buildJs() {
    const files = await getOrderedFiles(scriptsDir, '.js');
    const combinedJs = await readFilesWithBanner(files, 'js');

    await fs.writeFile(outputFiles.jsUncompressed, combinedJs, 'utf8');

    try {
        const minified = await minifyJs(combinedJs, {
            ecma: 5,
            compress: true,
            mangle: true,
            format: {
                comments: false,
            },
        });

        if (!minified.code) {
            throw new Error('JS minify failed: terser produced empty output.');
        }

        await fs.writeFile(outputFiles.jsMinified, `${minified.code}\n`, 'utf8');
    } finally {
        await fs.rm(outputFiles.jsUncompressed, { force: true });
    }
}

async function clean() {
    await Promise.all(
        Object.values(outputFiles).map((file) => fs.rm(file, { force: true }))
    );
}

function watchAssets() {
    gulpWatch(path.join(stylesDir, '*.css'), buildCss);
    gulpWatch(path.join(scriptsDir, '*.js'), buildJs);
}

const build = parallel(buildCss, buildJs);

exports.css = buildCss;
exports.js = buildJs;
exports.clean = clean;
exports.watch = watchAssets;
exports.build = build;
exports.default = build;
