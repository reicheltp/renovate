const configParser = require('../../config');
const pkgWorker = require('../package');
const packageJson = require('./package-json');
let logger = require('../../logger');

module.exports = {
  renovateDepType,
  getDepConfig,
};

async function renovateDepType(packageContent, config) {
  logger = config.logger || logger;
  logger.trace({ config }, `renovateDepType(packageContent, config)`);
  if (config.enabled === false) {
    logger.debug('depType is disabled');
    return [];
  }
  let deps = [];
  if (config.packageFile.endsWith('package.json')) {
    // Extract all dependencies from the package.json
    deps = await packageJson.extractDependencies(
      packageContent,
      config.depType
    );
    deps = deps.filter(
      dependency => config.monorepoPackages.indexOf(dependency.depName) === -1
    );
    logger.debug(`deps length is ${deps.length}`);
    logger.debug({ deps }, `deps`);
  } else if (config.packageFile.endsWith('package.js')) {
    try {
      deps = packageContent
        .match(/Npm\.depends\({([\s\S]*?)}\);/)[1]
        .replace(/(\s|\\n|\\t|'|")/g, '')
        .split(',')
        .map(dep => dep.split(/:(.*)/))
        .map(arr => ({
          depType: 'npmDepends',
          depName: arr[0],
          currentVersion: arr[1],
        }));
    } catch (err) {
      logger.warn({ packageContent }, 'Failed to parse meteor package.js');
    }
  } else if (config.packageFile.endsWith('Dockerfile')) {
    const [imagetag, currentDigest] = config.currentFrom.split('@');
    const [depName, currentTag] = imagetag.split(':');
    logger.info({ depName, currentTag, currentDigest }, 'Dockerfile');
    deps = [
      {
        depType: 'Dockerfile',
        depName,
        currentTag: currentTag || 'latest',
        currentDigest,
      },
    ];
  }
  deps = deps.filter(
    dependency => config.ignoreDeps.indexOf(dependency.depName) === -1
  );
  logger.debug(`filtered deps length is ${deps.length}`);
  logger.debug({ deps }, `filtered deps`);
  // Obtain full config for each dependency
  const depConfigs = deps.map(dep => module.exports.getDepConfig(config, dep));
  logger.trace({ config: depConfigs }, `depConfigs`);
  // renovateDepType can return more than one upgrade each
  const pkgWorkers = depConfigs.map(depConfig =>
    pkgWorker.renovatePackage(depConfig)
  );
  // Use Promise.all to execute npm queries in parallel
  const allUpgrades = await Promise.all(pkgWorkers);
  logger.trace({ config: allUpgrades }, `allUpgrades`);
  // Squash arrays into one
  const combinedUpgrades = [].concat(...allUpgrades);
  logger.trace({ config: combinedUpgrades }, `combinedUpgrades`);
  return combinedUpgrades;
}

function getDepConfig(depTypeConfig, dep) {
  let depConfig = configParser.mergeChildConfig(depTypeConfig, dep);
  // Apply any matching package rules
  if (depConfig.packageRules) {
    depConfig.packageRules.forEach(packageRule => {
      let applyRule = false;
      if (
        packageRule.packageNames &&
        packageRule.packageNames.includes(depConfig.depName)
      ) {
        applyRule = true;
      } else if (packageRule.packagePatterns) {
        for (const packagePattern of packageRule.packagePatterns) {
          const packageRegex = new RegExp(packagePattern);
          if (depConfig.depName.match(packageRegex)) {
            applyRule = true;
          }
        }
      }
      if (
        packageRule.excludePackageNames &&
        packageRule.excludePackageNames.includes(depConfig.depName)
      ) {
        applyRule = false;
      } else if (packageRule.excludePackagePatterns) {
        for (const packagePattern of packageRule.excludePackagePatterns) {
          const packageRegex = new RegExp(packagePattern);
          if (depConfig.depName.match(packageRegex)) {
            applyRule = false;
          }
        }
      }
      if (applyRule) {
        // Package rule config overrides any existing config
        depConfig = configParser.mergeChildConfig(depConfig, packageRule);
        delete depConfig.packageNames;
        delete depConfig.packagePatterns;
        delete depConfig.excludePackageNames;
        delete depConfig.excludePackagePatterns;
      }
    });
  }
  depConfig.logger = logger.child({
    repository: depConfig.repository,
    packageFile: depConfig.packageFile,
    depType: depConfig.depType,
    dependency: depConfig.depName,
  });
  return configParser.filterConfig(depConfig, 'package');
}
