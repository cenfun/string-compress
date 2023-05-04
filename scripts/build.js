const fs = require('fs');
const path = require('path');
const CG = require('console-grid');
const esbuild = require('esbuild');

const lz = require('lz-utils');
const fflate = require('fflate');

const buildItem = async (util, srcPath) => {

    const distDir = path.resolve(__dirname, '../dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
    }

    const outfile = path.resolve(distDir, `${util.filename}.js`);

    const result = await esbuild.build({
        entryPoints: [srcPath],
        outfile,
        minify: true,
        metafile: true,
        bundle: true,
        format: 'cjs',
        legalComments: 'none',
        target: 'node16',
        platform: 'node'
    });

    const metafile = result.metafile;
    const metaPath = path.resolve(distDir, `${util.filename}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metafile, null, 4));

    return outfile;
};

const compressItem = async (item) => {

    const fileStr = fs.readFileSync(item.path).toString('utf-8');

    const srcDir = path.resolve(__dirname, '../src');
    if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir);
    }

    const utils = [
        {
            name: 'lz-utils',
            compress: lz.compress,
            src: (filename) => {
                return `
                    const { decompress } = require('lz-utils');
                    const compressed = require("./${filename}");
                    console.log(compressed.length);
                    module.exports = decompress(compressed);
                `;
            },
            decompress: lz.decompress
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
                    const fflate = require('fflate');
                    const compressed = require("./${filename}");
                    console.log(compressed.length);
                    let buff = Buffer.from(compressed, 'base64');
                    const decompressed = fflate.decompressSync(buff);
                    module.exports = decompressed;
                `;
            },
            decompress: (str) => {

            }
        }
    ];

    const subs = [];
    for (const util of utils) {
        console.log(`compress ${item.filename} with ${util.name} ...`);

        let time_start = Date.now();
        const compressed = util.compress(fileStr);

        const filename = `${item.filename}-${util.name}`;
        util.filename = filename;

        const dataPath = path.resolve(srcDir, `${filename}.data.js`);
        fs.writeFileSync(dataPath, `module.exports = "${compressed}";`);

        const srcStr = util.src(`${filename}.data.js`);

        const srcPath = path.resolve(srcDir, `${filename}.src.js`);
        fs.writeFileSync(srcPath, srcStr);

        const outfile = await buildItem(util, srcPath);

        const duration = Date.now() - time_start;
        time_start = Date.now();

        const stat = fs.statSync(outfile);
        const size = compressed.length;
        const distSize = stat.size;

        const decompressed = require(outfile);
        console.log(fileStr.length, decompressed.length, filename);
        console.assert(fileStr === decompressed);

        const time = Date.now() - time_start;

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
        name: item.filename,
        size: fileStr.length,
        duration: '',
        subs
    };
};

const build = async () => {
    const jsonDir = path.resolve(__dirname, '../json');
    const list = fs.readdirSync(jsonDir);

    // list.length = 1;

    const rows = [];
    let i = 0;
    for (const filename of list) {
        const row = await compressItem({
            filename,
            path: path.resolve(jsonDir, filename)
        });

        rows.push(row);
        if (i < list.length - 1) {
            rows.push({
                innerBorder: true
            });
        }
        i++;
    }

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
