import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GameProjectDocument, SceneDocument } from './types.js';

const gameSource = `
(async () => {
  const [project, scene] = await Promise.all([fetch('./project.json').then(r => r.json()), fetch('./scene.json').then(r => r.json())]);
  class GameScene extends Phaser.Scene {
    constructor() { super('game'); this.objects = new Map(); }
    create() {
      this.cameras.main.setBackgroundColor(scene.world.background);
      this.physics.world.setBounds(0, 0, scene.world.width, scene.world.height);
      for (const object of [...scene.objects].sort((a,b) => a.layer-b.layer)) {
        const color = Phaser.Display.Color.HexStringToColor(object.color).color;
        const shape = object.kind === 'enemy' ? this.add.circle(object.position.x, object.position.y, object.size.x/2, color, .92) : this.add.rectangle(object.position.x, object.position.y, object.size.x, object.size.y, color, object.kind === 'trigger' ? .18 : .92);
        shape.setDepth(object.layer).setData('document', object); this.objects.set(object.id, shape);
        if (object.kind === 'player') { this.physics.add.existing(shape); shape.body.setCollideWorldBounds(true); this.player = shape; }
        if (object.kind === 'trigger') { this.physics.add.existing(shape, true); this.goal = shape; }
      }
      this.cursors = this.input.keyboard.createCursorKeys(); this.wasd = this.input.keyboard.addKeys('W,A,S,D');
      if (this.player) this.cameras.main.startFollow(this.player, true, .12, .12);
      this.cameras.main.setBounds(0, 0, scene.world.width, scene.world.height);
      this.message = this.add.text(16, 16, project.name + '\\nReach the violet objective. WASD / arrows.', { fontFamily: 'system-ui', fontSize: '16px', color: '#fff4df', backgroundColor: '#17120fcc', padding: { x: 10, y: 7 } }).setScrollFactor(0).setDepth(9999);
    }
    update() {
      if (!this.player) return;
      const object = this.player.getData('document'); const movement = object.components.find(c => c.type === 'top-down-movement'); const speed = Number(movement?.properties?.speed || 200);
      let x=0,y=0; if(this.cursors.left.isDown||this.wasd.A.isDown)x--; if(this.cursors.right.isDown||this.wasd.D.isDown)x++; if(this.cursors.up.isDown||this.wasd.W.isDown)y--; if(this.cursors.down.isDown||this.wasd.S.isDown)y++;
      const length=Math.hypot(x,y)||1; this.player.body.setVelocity((x/length)*speed,(y/length)*speed); if(!x&&!y)this.player.body.setVelocity(0,0);
      if(this.goal && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.goal.getBounds())) this.message.setText(project.name+'\\nObjective complete. Export runs independently.');
    }
  }
  new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: project.viewport.x, height: project.viewport.y, backgroundColor: scene.world.background, physics: { default: 'arcade' }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: false, pixelArt: true }, scene: [GameScene] });
})();
`;

export async function exportWebGame(root: string, project: GameProjectDocument, scene: SceneDocument): Promise<string> {
  const output = path.join(root, 'exports', 'web');
  await mkdir(output, { recursive: true });
  await copyFile(path.resolve(process.cwd(), 'node_modules/phaser/dist/phaser.min.js'), path.join(output, 'phaser.min.js'));
  await writeFile(path.join(output, 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
  await writeFile(path.join(output, 'scene.json'), `${JSON.stringify(scene, null, 2)}\n`);
  await writeFile(path.join(output, 'game.js'), gameSource);
  await writeFile(path.join(output, 'index.html'), `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.name.replaceAll('<','&lt;')}</title><style>html,body,#game{width:100%;height:100%;margin:0;background:#0d0b0a;overflow:hidden}canvas{display:block}</style></head><body><div id="game"></div><script src="./phaser.min.js"></script><script src="./game.js"></script></body></html>`);
  return output;
}
