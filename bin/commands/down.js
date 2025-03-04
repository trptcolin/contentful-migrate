#!/usr/bin/env node
// vim: set ft=javascript:

const path = require('path')
const runMigrations = require('migrate/lib/migrate')
const log = require('migrate/lib/log')
const load = require('../../lib/load')
const registerCompiler = require('migrate/lib/register-compiler')

exports.command = 'down [file]'

exports.desc =
  'Migrate down to a given migration or just the last one if not specified'

exports.builder = (yargs) => {
  yargs
    .option('access-token', {
      alias: 't',
      describe:
        'Contentful Management API access token',
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      defaultDescription: 'environment var CONTENTFUL_MANAGEMENT_ACCESS_TOKEN'
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use',
      type: 'string',
      requiresArg: true,
      demandOption: true
    })
    .option('environment-id', {
      alias: 'e',
      describe: 'id of the environment within the space',
      type: 'string',
      requiresArg: true,
      default: 'master'
    })
    .option('content-type', {
      alias: 'c',
      describe: 'single content type name to process',
      demandOption: true
    })
    .option('compiler', {
      describe: 'compiler to add, e.g. "ts:./tsnode.js"',
      type: 'string',
      requiresArg: false
    })
    .option('dry-run', {
      alias: 'd',
      describe: 'only shows the planned actions, don\'t write anything to Contentful',
      boolean: true,
      default: false
    })
    .positional('file', {
      describe: 'If specified, rollback all migrations scripts down to this one.',
      type: 'string'
    })
}

exports.handler = async (args) => {
  const {
    accessToken,
    contentType,
    dryRun,
    environmentId,
    file,
    spaceId,
    compiler
  } = args
  if (compiler) {
    registerCompiler(compiler)
  }

  const migrationsDirectory = path.join('.', 'migrations')

  const processSet = (set) => {
    const name = (file) || set.lastRun

    runMigrations(set, 'down', name, (error) => {
      if (error) {
        log('error', error)
        process.exit(1)
      }

      log('migration', 'complete')
      process.exit(0)
    })
  }

  // Load in migrations
  const sets = await load({
    migrationsDirectory, spaceId, environmentId, accessToken, dryRun, contentTypes: [contentType]
  })

  sets.forEach(set => set
    .then(processSet)
    .catch((err) => {
      log.error('error', err)
      process.exit(1)
    }))
}
