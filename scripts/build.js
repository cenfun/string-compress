const fs = require('fs');
const path = require('path');
const CG = require('console-grid');
const esbuild = require('esbuild');
const { chromium } = require('@playwright/test');

const lz = require('lz-utils');
const fflate = require('fflate');

const hasOwn = function(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
};

const replace = function(str, obj) {
    str = `${str}`;
    if (!obj) {
        return str;
    }
    str = str.replace(/\{([^}{]+)\}/g, function(match, key) {
        if (!hasOwn(obj, key)) {
            return match;
        }
        return obj[key];
    });
    return str;
};

const buildItem = async (util, srcPath, distDir) => {

    const outfile = path.resolve(distDir, `${util.filename}.js`);

    const result = await esbuild.build({
        entryPoints: [srcPath],
        outfile,
        minify: true,
        metafile: true,
        bundle: true,
        // format: 'cjs',
        legalComments: 'none',
        target: 'node16',
        platform: 'node'
    });

    const metafile = result.metafile;
    const metaPath = path.resolve(distDir, `${util.filename}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metafile, null, 4));

    return outfile;
};

const saveHtml = (util, distDir) => {
    const template = fs.readFileSync(path.resolve(__dirname, './template.html')).toString('utf-8');
    const html = replace(template, {
        title: util.filename,
        content: `<script src="${util.filename}.js"></script>`
    });
    const htmlPath = path.resolve(distDir, `${util.filename}.html`);
    fs.writeFileSync(htmlPath, html);

    return htmlPath;
};

const decompressItem = async (htmlPath, fileStr, browser) => {

    const page = await browser.newPage();
    const watcher = page.waitForFunction(() => window.decompressed);
    await page.goto(`file://${path.resolve(htmlPath)}`);
    await watcher;

    const decompressed = await page.evaluate(() => {
        return window.decompressed;
    });

    await page.close();

    console.assert(decompressed.value === fileStr);

    return decompressed.duration;
};

const initDirs = () => {
    const dirs = {
        srcDir: 'src',
        distDir: 'dist'
    };
    Object.keys(dirs).forEach((k) => {
        const dir = path.resolve(__dirname, `../${dirs[k]}`);
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, {
                recursive: true,
                force: true
            });
        }
        fs.mkdirSync(dir);
        dirs[k] = dir;
    });
    return dirs;
};

const compressItem = async (item) => {

    const {
        jsonName, jsonPath, srcDir, distDir, browser
    } = item;

    // https://developer.mozilla.org/en-US/docs/Glossary/Base64

    const utils = [
        {
            name: 'lz',
            compress: lz.compress,
            src: (filename) => {
                return `
                    import { decompress } from 'lz-utils';
                    import compressed from "./${filename}";

                    const time_start = Date.now();
                    const res = decompress(compressed);

                    window.decompressed = {
                        duration: Date.now() - time_start,
                        value: res
                    };

                    console.log(JSON.parse(res));
                `;
            }
        },
        {
            name: 'fflate',
            compress: (str) => {
                const buf = fflate.strToU8(str);
                const compressedString = fflate.compressSync(buf);
                return Buffer.from(compressedString).toString('base64');
            },
            src: (filename) => {
                return `
                    import { decompressSync } from 'fflate/browser';
                    import compressedB64 from "./${filename}";

                    import { b64ToU8a, uint8ArrToString } from "../scripts/b64-to-u8a.js";
                    
                    const time_start = Date.now();

                    const buff = b64ToU8a(compressedB64);
                    const u8a = decompressSync(buff);
                    const res = uint8ArrToString(u8a);

                    window.decompressed = {
                        duration: Date.now() - time_start,
                        value: res
                    };

                    console.log(JSON.parse(res));
                `;
            }
        }
    ];

    const fileStr = fs.readFileSync(jsonPath).toString('utf-8');

    const subs = [];
    for (const util of utils) {
        console.log(`compress ${jsonName} with ${util.name} ...`);

        const time_start = Date.now();
        const compressed = util.compress(fileStr);

        const filename = `${path.basename(jsonName, path.extname(jsonName))}-${util.name}`;
        util.filename = filename;

        const dataPath = path.resolve(srcDir, `${filename}.data.js`);
        fs.writeFileSync(dataPath, `module.exports = "${compressed}";`);

        const srcStr = util.src(`${filename}.data.js`);

        const srcPath = path.resolve(srcDir, `${filename}.src.js`);
        fs.writeFileSync(srcPath, srcStr);

        const outfile = await buildItem(util, srcPath, distDir);

        const duration = Date.now() - time_start;

        const stat = fs.statSync(outfile);
        const size = compressed.length;
        const distSize = stat.size;

        // decompress in browser
        const htmlPath = saveHtml(util, distDir);
        const time = await decompressItem(htmlPath, fileStr, browser);

        subs.push({
            name: util.name,
            size,
            duration,
            distSize,
            jsSize: distSize - size,
            time
        });
    }

    return {
        name: jsonName,
        size: fileStr.length,
        duration: '',
        subs
    };
};

const build = async () => {

    const { srcDir, distDir } = initDirs();
    const browser = await chromium.launch();

    const jsonDir = path.resolve(__dirname, '../json');
    const list = fs.readdirSync(jsonDir);

    // list.length = 1;

    const rows = [];
    let i = 0;
    for (const jsonName of list) {
        const row = await compressItem({
            jsonName,
            jsonPath: path.resolve(jsonDir, jsonName),
            srcDir,
            distDir,
            browser
        });

        rows.push(row);
        if (i < list.length - 1) {
            rows.push({
                innerBorder: true
            });
        }
        i++;
    }

    await browser.close();

    CG({
        columns: [{
            id: 'name',
            name: 'name'
        }, {
            id: 'duration',
            name: 'c time',
            align: 'right',
            formatter: (v) => {
                if (v) {
                    return `${v.toLocaleString()} ms`;
                }
                return v;
            }
        }, {
            id: 'size',
            name: 's size',
            align: 'right',
            formatter: (v) => {
                if (v) {
                    return v.toLocaleString();
                }
                return v;
            }
        }, {
            id: 'distSize',
            name: 'dist size',
            align: 'right',
            formatter: (v) => {
                if (v) {
                    return v.toLocaleString();
                }
                return v;
            }
        }, {
            id: 'jsSize',
            name: 'js size',
            align: 'right',
            formatter: (v) => {
                if (v) {
                    return v.toLocaleString();
                }
                return v;
            }
        }, {
            id: 'time',
            name: 'd time',
            align: 'right',
            formatter: (v) => {
                if (v) {
                    return `${v.toLocaleString()} ms`;
                }
                return v;
            }
        }],
        rows
    });

};

build();
