const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (msg = 'undefined', type) => {
  if (type && type.length) {
    process.stdout.write(`${type}: `);
  }
  process.stdout.write(msg);
  process.stdout.write('\n');
};

const usage = () => {
  log(`\
Usage: node generate_images.js <version> /path/to/image/dir [options...]
Options:
  --backends=(all|jsdom|pptr) : Specify which backend(s) to run.
  --parallel=<num> : Number of parallel processes. Defaults to the number of CPUs.\
  `);
  process.exit(1);
};

const parseArgs = () => {
  const argv = [...process.argv];
  if (argv.length < 4) {
    usage();
  }

  const argv0 = argv.shift();
  argv.shift(); // skip this script name.
  const childArgs = {
    argv0,
    ver: argv.shift(),
    imageDir: argv.shift(),
    args: [],
  };

  let backends;
  let parallel = require('os').cpus().length;

  argv.forEach((str) => {
    const prop = str.split('=');
    const name = (prop[0] || '').toLowerCase();
    const value = prop[1];
    const intValue = parseInt(value, 10);
    switch (name) {
      case '--backends':
        backends = backends || {};
        value
          .toLowerCase()
          .split(',')
          .forEach((backend) => {
            switch (backend) {
              case 'pptr':
              case 'jsdom':
              case 'all':
                backends[backend] = true;
                break;
              default:
                log(`unknown backend: ${backend}`, 'error');
                usage();
                break;
            }
          });
        break;
      case '--parallel':
        if (value && !Number.isNaN(intValue) && intValue > 0) {
          parallel = intValue;
        } else {
          log(`invalid value for --parallel: ${value}`, 'error');
          usage();
        }
        break;
      case '--help':
        usage();
        break;
      default:
        childArgs.args.push(str);
        break;
    }
  });

  backends = backends ?? {
    jsdom: true,
  };

  return { childArgs, backends, parallel };
};

const resolveJobsOption = (verIn) => {
  let numTests = NaN;
  let ver = 'build';

  let jsFileName;
  const tJsFileName = `../${verIn}/cjs/vexflow-debug-with-tests.js`;
  if (fs.existsSync(path.resolve(__dirname, tJsFileName))) {
    ver = verIn;
    jsFileName = tJsFileName;
  }

  if (jsFileName) {
    try {
      global.VexFlow = require(jsFileName);
      if (global.VexFlow) {
        const { Test } = VexFlow;
        if (Test && Test.tests && Test.parseJobOptions) {
          numTests = Test.tests.length;
        }
      }
    } catch (e) {
      // may old release, ignore
      log(e.toString(), 'warn');
    }
  }

  if (Number.isNaN(numTests)) {
    log('Parallel execution mode is not supported.', 'info');
  }

  return {
    numTests,
    pptrJobs: 8,
    ver,
  };
};

const appMain = async () => {
  const options = parseArgs();
  const { childArgs, backends, parallel } = options;

  const { numTests, pptrJobs, ver } = resolveJobsOption(childArgs.ver);
  const { imageDir, args } = childArgs;

  const jobs = Math.min(pptrJobs, parallel);

  const backendDefs = {
    jsdom: {
      path: './tools/generate_images_jsdom.js',
      args: [`../${ver}`, imageDir].concat(args),
      jobs,
    },
    pptr: {
      path: './tools/generate_images_pptr.js',
      args: [ver, imageDir].concat(args),
      jobs,
    },
  };

  const execChild = (backend, jobs, job, key) => {
    const proc = `${key}:${ver}_${backend}_${job}/${jobs}`;
    log(`${proc} start`);
    const backendDef = backendDefs[backend];
    const child = spawn(childArgs.argv0, [backendDef.path].concat(backendDef.args, [`--jobs=${jobs}`, `--job=${job}`]));
    return new Promise((resolve) => {
      child.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      child.on('close', (code) => {
        log(`\n${proc} closed with code ${code}`);
        resolve({ key, code });
      });
    });
  };

  const execChildren = async (backends) => {
    log(
      JSON.stringify({
        ver,
        parallel,
        numTests,
        pptrJobs,
        backends,
        jsdomNumJobs: backendDefs.jsdom.jobs,
        pptrNumJobs: backendDefs.pptr.jobs,
      })
    );

    const children = {};
    let ps = [];
    const push = (key, promise) => {
      children[key] = promise;
      ps = Object.values(children);
    };

    const race = async () => {
      if (!ps.length) {
        return { code: 0 };
      }
      const { key, code } = await Promise.race(ps);
      delete children[key];
      ps = Object.values(children);
      return { code };
    };

    let exitCode = 0;
    let key = 0;
    const requests = [];

    for (const backend in backendDefs) {
      if (!backends.none && (backends.all || backends[backend])) {
        const { jobs } = backendDefs[backend];
        for (let job = 0; job < jobs; job += 1, key += 1) {
          requests.push({ backend, jobs, job, key });
        }
      }
    }

    while (requests.length || ps.length) {
      while (ps.length < parallel && requests.length) {
        const { backend, jobs, job, key } = requests.shift();
        push(key, execChild(backend, jobs, job, key));
      }
      if (ps.length) {
        const { code } = await race();
        if (code) {
          exitCode = code;
          log('child error. aborting...');
          break;
        }
      }
    }

    return exitCode;
  };

  fs.mkdirSync(imageDir, { recursive: true });

  const exitCode = await execChildren(backends);
  log(exitCode ? 'aborted.' : 'done.');
  process.exit(exitCode);
};

appMain();

// log('end of file ---------------------------------------');
