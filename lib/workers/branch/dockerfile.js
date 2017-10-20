module.exports = {
  setNewValue,
};

function setNewValue(
  currentFileContent,
  depName,
  currentVersion,
  newVersion,
  logger
) {
  logger.debug(`setNewValue: ${depName} = ${newVersion}`);
  const regexReplace = new RegExp(`(?:^\\s*)FROM (${currentVersion})\\s*`, 'im');
  const newFileContent = currentFileContent.replace(
    regexReplace,
    `$1${newVersion}`
  );
  return newFileContent;
}
