var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var chalk = require('chalk');

var target = process.argv[2] || './src';
var watcher = fs.watch(target, {recursive: true});

watcher.on('change', function(evt, filename) {
  console.log(chalk.gray('%s - %s'), evt, filename);
  if (path.basename(filename).indexOf('.') === 0) return;

  filename = path.join(target, filename);

  var contents = fs.readFileSync(filename).toString();

  function findAllImports(string) {
    var ms = [];
    var regex = /import [^ ]+ from ['"]([^'"]+)['"]/gm;
    var m = regex.exec(string);

    while (m) {
      ms.push(m[1]);
      m = regex.exec(string);
    }

    return ms;
  }

  var imports = findAllImports(contents)
    .filter((i) => i.charAt(0) !== '.' && i.charAt(0) !== '/')
    .map((i) => i.split('/')[0]);

  imports.forEach((i) => {
    console.log(chalk.yellow('Checking if %s exists...'), i);

    try {
      require.resolve(i);
    } catch(err) {
      console.log(chalk.blue('Installing missing dependency %s...'), i);
      console.log(chalk.gray('     $ npm install --save %s'), i);
      child_process.execSync('npm install --save ' + i, {stdio: 'inherit'});
    }
  });
});

console.log(chalk.yellow('Watching for changes in %s'), target);
