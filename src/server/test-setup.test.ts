import { test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('fixture subprocess diagnostics stay plain when the test runner forces color', () => {
  const dir = mkdtempSync(join(tmpdir(), 'obeya-test-color-'));
  const fixture = join(dir, 'fixture.test.ts');
  writeFileSync(fixture, `
    import { expect, test } from 'bun:test';
    test('the fixture reports its diagnostic bytes unchanged', async () => {
      const failed = Bun.spawn([process.execPath, '-e', "console.error('no network'); process.exit(1)"], { env: { ...process.env }, stdout: 'pipe', stderr: 'pipe' });
      const stderr = await new Response(failed.stderr).text();
      expect(await failed.exited).toBe(1);
      expect(JSON.stringify(stderr)).toBe(JSON.stringify('no network\\n'));
    });
  `);
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: '1' };
  delete env.NO_COLOR;
  try {
    const result = Bun.spawnSync([process.execPath, 'test', '--preload', join(import.meta.dir, 'test-setup.ts'), fixture], { cwd: dir, env, stdout: 'pipe', stderr: 'pipe' });
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
