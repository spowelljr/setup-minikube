import {
  restoreCache as restoreCacheAction,
  saveCache as saveCacheAction,
} from '@actions/cache'
import {getInput} from '@actions/core'
import {exec} from '@actions/exec'
import {arch} from 'os'
import {join} from 'path'

type CacheHits = {
  iso: boolean
  kic: boolean
  preload: boolean
}

export async function restoreCaches(): Promise<CacheHits> {
  const minikubeVersion = await getMinikubeVersion()
  const isoCacheKey = restoreCache('iso', minikubeVersion)
  const kicCacheKey = restoreCache('kic', minikubeVersion)
  const preloadCacheKey = restoreCache('preload', minikubeVersion)
  const cacheHits: CacheHits = {
    iso: typeof (await isoCacheKey) !== 'undefined',
    kic: typeof (await kicCacheKey) !== 'undefined',
    preload: typeof (await preloadCacheKey) !== 'undefined',
  }
  return cacheHits
}

async function getMinikubeVersion(): Promise<string> {
  let version = ''
  const options: any = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      version += data.toString()
    },
  }
  await exec('minikube', ['version', '--short'], options)
  return version
}

export async function saveCaches(cacheHits: CacheHits): Promise<void> {
  const minikubeVersion = await getMinikubeVersion()
  if (!cacheHits.iso) {
    await saveCache('iso', minikubeVersion)
  }
  if (!cacheHits.kic) {
    await saveCache('kic', minikubeVersion)
  }
  if (!cacheHits.preload) {
    await saveCache('preload', minikubeVersion)
  }
}

async function restoreCache(
  name: string,
  minikubeVersion: string
): Promise<string | undefined> {
  return restoreCacheAction(
    getCachePaths(name),
    getCacheKey(name, minikubeVersion)
  )
}

async function saveCache(name: string, minikubeVersion: string): Promise<void> {
  await saveCacheAction(getCachePaths(name), getCacheKey(name, minikubeVersion))
}

function getCachePaths(folderName: string): string[] {
  return [join('.minikube', 'cache', folderName)]
}

function getCacheKey(name: string, minikubeVersion: string): string {
  let cacheKey = `${name}-${minikubeVersion}-${arch()}`
  if (name === 'preload') {
    const kubernetesVersion =
      getInput('kubernetes-version').toLowerCase() || 'stable'
    const containerRuntime =
      getInput('container-runtime').toLowerCase() || 'docker'
    cacheKey += `-${kubernetesVersion}-${containerRuntime}`
  }
  return cacheKey
}
