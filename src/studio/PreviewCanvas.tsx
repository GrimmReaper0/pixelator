import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { SceneDocument, SceneObjectDocument } from '../core/types';

interface Props {
  scene: SceneDocument; selectedId?: string; playing: boolean; debugGrid: boolean;
  onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void; onMetrics: (text: string) => void;
}

class PixelatorScene extends Phaser.Scene {
  document?: SceneDocument; selectedId?: string; playing = false; debugGrid = true;
  callbacks: Pick<Props, 'onSelect' | 'onMove' | 'onMetrics'> = { onSelect: () => undefined, onMove: () => undefined, onMetrics: () => undefined };
  objects = new Map<string, Phaser.GameObjects.Container>();
  cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  constructor() { super('pixelator-preview'); }
  create() { this.cursors = this.input.keyboard?.createCursorKeys(); this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as typeof this.wasd; if (this.document) this.rebuild(); }
  sync(document: SceneDocument, selectedId: string | undefined, playing: boolean, debugGrid: boolean, callbacks: Pick<Props, 'onSelect' | 'onMove' | 'onMetrics'>) {
    this.document = document; this.selectedId = selectedId; this.playing = playing; this.debugGrid = debugGrid; this.callbacks = callbacks; if (this.sys.isActive()) this.rebuild();
  }
  rebuild() {
    if (!this.document) return;
    this.children.removeAll(true); this.objects.clear();
    this.cameras.main.setBackgroundColor(this.document.world.background); this.cameras.main.setBounds(0, 0, this.document.world.width, this.document.world.height); this.physics.world.setBounds(0, 0, this.document.world.width, this.document.world.height);
    if (this.debugGrid) {
      const graphics = this.add.graphics().setDepth(-1000); graphics.lineStyle(1, 0xffffff, 0.06);
      for (let x=0; x<=this.document.world.width; x+=this.document.world.gridSize) graphics.lineBetween(x,0,x,this.document.world.height);
      for (let y=0; y<=this.document.world.height; y+=this.document.world.gridSize) graphics.lineBetween(0,y,this.document.world.width,y);
    }
    for (const object of [...this.document.objects].sort((a,b) => a.layer-b.layer)) this.createObject(object);
    const player = this.document.objects.find((item) => item.kind === 'player'); if (player) this.cameras.main.centerOn(player.position.x, player.position.y);
    this.callbacks.onMetrics(`${this.document.objects.length} objects · ${this.document.world.width}×${this.document.world.height}`);
  }
  createObject(object: SceneObjectDocument) {
    const color = Phaser.Display.Color.HexStringToColor(object.color).color;
    const container = this.add.container(object.position.x, object.position.y).setDepth(object.layer).setName(object.id);
    const alpha = object.kind === 'trigger' ? 0.24 : 0.9;
    const shape = object.kind === 'enemy' ? this.add.circle(0,0,object.size.x/2,color,alpha) : this.add.rectangle(0,0,object.size.x,object.size.y,color,alpha);
    const label = this.add.text(0, object.size.y/2+9, object.name, { fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#f7efe3', backgroundColor: '#17120fcc', padding: { x: 5, y: 3 } }).setOrigin(.5,0);
    const selection = this.add.rectangle(0,0,object.size.x+10,object.size.y+10).setStrokeStyle(2,0xffcc66,object.id===this.selectedId?1:0).setFillStyle(0xffffff,0);
    container.add([shape, selection, label]); container.setSize(Math.max(32,object.size.x),Math.max(32,object.size.y)); container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => this.callbacks.onSelect(object.id)); this.input.setDraggable(container, !this.playing);
    container.on('drag', (_pointer: unknown, x: number, y: number) => { if (this.playing || !this.document) return; const grid=this.document.world.gridSize; container.setPosition(Math.round(x/grid)*grid, Math.round(y/grid)*grid); });
    container.on('dragend', () => this.callbacks.onMove(object.id, container.x, container.y));
    if (object.kind === 'player') { this.physics.add.existing(container); (container.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true); }
    this.objects.set(object.id, container);
  }
  update() {
    const document = this.document?.objects.find((object) => object.kind === 'player'); if (!this.playing || !document) return;
    const player = this.objects.get(document.id); if (!player?.body) return; const body=player.body as Phaser.Physics.Arcade.Body;
    const movement=document.components.find((component)=>component.type==='top-down-movement'); const speed=Number(movement?.properties?.speed??200);
    let x=0,y=0; if(this.cursors?.left.isDown||this.wasd?.A.isDown)x--; if(this.cursors?.right.isDown||this.wasd?.D.isDown)x++; if(this.cursors?.up.isDown||this.wasd?.W.isDown)y--; if(this.cursors?.down.isDown||this.wasd?.S.isDown)y++;
    const length=Math.hypot(x,y)||1; body.setVelocity((x/length)*speed,(y/length)*speed); if(!x&&!y)body.setVelocity(0,0); this.cameras.main.startFollow(player,true,.12,.12);
  }
}

export function PreviewCanvas(props: Props) {
  const host=useRef<HTMLDivElement|null>(null); const game=useRef<Phaser.Game|undefined>(undefined); const preview=useRef(new PixelatorScene());
  useEffect(() => { if(!host.current||game.current)return; game.current=new Phaser.Game({ type: Phaser.AUTO, parent: host.current, width:960, height:540, backgroundColor:props.scene.world.background, physics:{default:'arcade',arcade:{debug:false}}, scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}, scene:[preview.current], render:{antialias:false,pixelArt:true} }); return()=>{game.current?.destroy(true);game.current=undefined}; },[]);
  useEffect(() => preview.current.sync(props.scene,props.selectedId,props.playing,props.debugGrid,{onSelect:props.onSelect,onMove:props.onMove,onMetrics:props.onMetrics}),[props.scene,props.selectedId,props.playing,props.debugGrid,props.onSelect,props.onMove,props.onMetrics]);
  return <div className="preview-canvas" ref={host}/>;
}
