#!/usr/bin/env node
/*
 * Bundle the game into one self-contained HTML file (CSS and JS inlined),
 * handy for e-mailing to students or uploading to a course site.
 *
 *   node tools/build.js                 -> dist/long-and-variable.html
 *   node tools/build.js --fragment out  -> also writes a head/body fragment
 */
'use strict';
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function inline(src) {
  return src
    .replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, function (_, f) {
      return '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '</style>';
    })
    .replace(/<script src="(js\/[^"]+)"><\/script>/g, function (_, f) {
      return '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>';
    });
}

var out = inline(html);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'long-and-variable.html'), out);
console.log('wrote dist/long-and-variable.html (' + Math.round(out.length / 1024) + ' KB)');

var i = process.argv.indexOf('--fragment');
if (i > -1 && process.argv[i + 1]) {
  var head = out.split('<!-- build:head -->')[1].split('<!-- /build:head -->')[0];
  var body = out.split('<!-- build:body -->')[1].split('<!-- /build:body -->')[0];
  fs.writeFileSync(process.argv[i + 1], head.trim() + '\n' + body.trim() + '\n');
  console.log('wrote fragment ' + process.argv[i + 1]);
}
