const configParser = require('../../config');
const depTypeWorker = require('../dep-type');
const npmApi = require('../../api/npm');

let logger = require('../../logger');

module.exports = {
  renovatePackageFile,
  renovateMeteorPackageFile,
  renovateDockerfile,
};

async function renovatePackageFile(packageFileConfig) {
  const config = { ...packageFileConfig };
  if (config.npmrc) {
    npmApi.setNpmrc(config.npmrc);
  }
  let upgrades = [];
  ({ logger } = config);
  logger.info(`Processing package file`);

  // Check if config is disabled
  if (config.enabled === false) {
    logger.info('packageFile is disabled');
    return upgrades;
  }

  const depTypes = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ];
  const depTypeConfigs = depTypes.map(depType => {
    const depTypeConfig = configParser.mergeChildConfig(config, {
      ...config[depType],
    });
    depTypeConfig.depType = depType;
    depTypeConfig.logger = logger.child({
      repository: depTypeConfig.repository,
      packageFile: depTypeConfig.packageFile,
      depType: depTypeConfig.depType,
    });
    logger.trace({ config: depTypeConfig }, 'depTypeConfig');
    return configParser.filterConfig(depTypeConfig, 'depType');
  });
  logger.trace({ config: depTypeConfigs }, `depTypeConfigs`);
  for (const depTypeConfig of depTypeConfigs) {
    upgrades = upgrades.concat(
      await depTypeWorker.renovateDepType(config.content, depTypeConfig)
    );
  }
  if (
    config.lockFileMaintenance.enabled &&
    (config.yarnLock || config.packageLock)
  ) {
    logger.debug('lockFileMaintenance enabled');
    // Maintain lock files
    const lockFileMaintenanceConf = configParser.mergeChildConfig(
      config,
      config.lockFileMaintenance
    );
    lockFileMaintenanceConf.type = 'lockFileMaintenance';
    logger.trace(
      { config: lockFileMaintenanceConf },
      `lockFileMaintenanceConf`
    );
    upgrades.push(configParser.filterConfig(lockFileMaintenanceConf, 'branch'));
  }

  logger.info('Finished processing package file');
  return upgrades;
}

async function renovateMeteorPackageFile(packageFileConfig) {
  const config = { ...packageFileConfig };
  let upgrades = [];
  ({ logger } = config);
  logger.info(`Processing meteor package file`);

  // Check if config is disabled
  if (config.enabled === false) {
    logger.info('packageFile is disabled');
    return upgrades;
  }
  const content = await packageFileConfig.api.getFileContent(
    packageFileConfig.packageFile
  );
  upgrades = upgrades.concat(
    await depTypeWorker.renovateDepType(content, packageFileConfig)
  );
  logger.info('Finished processing package file');
  return upgrades;
}

async function renovateDockerfile(packageFileConfig) {
  let upgrades = [];
  ({ logger } = packageFileConfig);
  logger.info(`Processing Dockerfile`);

  // Check if config is disabled
  if (packageFileConfig.enabled === false) {
    logger.info('Dockerfile is disabled');
    return upgrades;
  }
  upgrades = upgrades.concat(
    await depTypeWorker.renovateDepType(
      packageFileConfig.content,
      packageFileConfig
    )
  );
  logger.info('Finished processing Dockerfile');
  return upgrades;
}
