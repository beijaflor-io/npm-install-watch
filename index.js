#!/usr/bin/env node
var chalk = require('chalk');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var program = require('commander');
var resolve = require('resolve');

program
  .usage('npm-install-watch [options] ...TARGET')
  .version('1.0.0')
  .parse(process.argv);

program.args.forEach(function(target) {
  var stat = fs.statSync(target);
  createWatcher(target, stat.isDirectory());
});

function createWatcher(target, isDirectory) {
  var watcher = fs.watch(target, {recursive: true});
  var basedir = process.cwd();

  watcher.on('change', function(evt, filename) {
    console.log(chalk.blue('%s - %s'), evt, filename);

    if (filename && filename.charAt(filename.length - 1) === '~') {
      filename = filename.slice(0, -1);
    }

    if (path.basename(filename).indexOf('.') === 0 ||
        path.extname(filename) !== '.js' ||
        !filename) {
      console.log(chalk.yellow('Ignoring event %s on %s'), evt, filename);
      return;
    }

    if (isDirectory) filename = path.join(target, filename);
    execute(filename, basedir);
  });

  console.log(chalk.yellow('Watching for changes in %s'), target);
}

function findAll(regex, string) {
  var ms = [];
  var m = regex.exec(string);

  while (m) {
    ms.push(m[1]);
    m = regex.exec(string);
  }

  return ms;
}

function findAllRequires(string) {
  var regex = /require\(['"]([^'"]+)['"]\)/gm;
  return findAll(regex, string);
}

function findAllImports(string) {
  var regex = /import [^ ]+ from ['"]([^'"]+)['"]/gm;
  return findAll(regex, string);
}

function execute(filename, basedir) {
  var contents = fs.readFileSync(filename).toString();

  var imports = findAllImports(contents)
    .concat(findAllRequires(contents))
    .filter((i) => i.charAt(0) !== '.' && i.charAt(0) !== '/')
    .map((i) => i.split('/')[0]);

  imports.forEach((i) => {
    process.stdout.write(chalk.gray('Checking if ' + i + ' exists... '));

    try {
      process.stdout.write(
        chalk.gray('Found ' + i + ' at ' + resolve.sync(i, {basedir: basedir}) + '\n')
      );
    } catch(err) {
      process.stdout.write('\n');
      console.log(chalk.blue('Installing missing dependency %s...'), i);
      console.log(chalk.gray('     $ npm install %s'), i);
      child_process.execSync('npm install ' + i, {
        stdio: 'inherit',
        cwd: basedir,
      });
    }
  });
}
