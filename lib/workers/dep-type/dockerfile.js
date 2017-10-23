module.exports = {
  extractDependencies,
}

function groupedRegex (string, pattern) {
  const result = []

  const matches = string.match(new RegExp(pattern.source, pattern.flags))

  for (let i = 0; i < matches.length; i += 1) {
    result.push(new RegExp(pattern.source, pattern.flags).exec(matches[i]))
  }

  return result
}

function extractDependencies (packageContent) {
  const deps = []

  // find matches
  const matches = groupedRegex(packageContent, /(?:^\s*)FROM (\w+\/?\w*)(?:([:@])(\w+)|\s+)/img)

  for (let i = 0; i < matches.length; i += 1) {
    const hasDigest = matches[i][2] === '@'
    const hasTag = matches[i][2] === ':'

    const dep = {
      depType: 'Dockerfile',
      depName: matches[i][1],
    }

    if (hasDigest) {
      dep.currentDigest = matches[i][3]
    } else if (hasTag) {
      dep.currentTag = matches[i][3]
    } else {
      dep.currentTag = 'latest'
    }

    deps.push(dep)
  }
  // logger.info({depName, currentTag, currentDigest}, 'Dockerfile')

  return deps
}
