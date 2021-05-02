import './style.css'
import * as THREE from 'three'
import { World } from 'oimo'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils'

var meshs = [];
var grounds = [];
var geos = {};
var mats = {};
var world = null;
var bodys = [];
var ToRad = 0.0174532925199432957;
var materialType = 'MeshBasicMaterial';

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 5000 );
camera.position.set( 0, 160, 400 );
scene.add(camera)

const controls = new OrbitControls( camera, canvas );
controls.target.set(0, 20, 0);
controls.update();

const renderer = new THREE.WebGLRenderer({ canvas:canvas, precision: "mediump", antialias:false });
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

scene.add( new THREE.AmbientLight( 0x3D4143 ) );
const directionalLight = new THREE.DirectionalLight( 0xffffff , 1.4);
directionalLight.position.set( 300, 1000, 500 );
directionalLight.target.position.set( 0, 0, 0 );
directionalLight.castShadow = true;

const d = 300;
directionalLight.shadow.camera = new THREE.OrthographicCamera( -d, d, d, -d,  500, 1600 );
directionalLight.shadow.bias = 0.0001;
directionalLight.shadow.mapSize.width = directionalLight.shadow.mapSize.height = 1024;
scene.add( directionalLight );

materialType = 'MeshPhongMaterial';

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;//THREE.BasicShadowMap;


//----------------------------------
//  Gradient Background
//----------------------------------
const buffgeoBack = new THREE.IcosahedronGeometry(3000,2);
const back = new THREE.Mesh( buffgeoBack, new THREE.MeshBasicMaterial( { map:gradTexture([[0.75,0.6,0.4,0.25], ['#1B1D1E','#3D4143','#72797D', '#b0babf']]), side:THREE.BackSide, depthWrite: false, fog:false }  ));
scene.add( back );


//----------------------------------
//  Box Floor
//----------------------------------
// geometry
geos['box'] = new THREE.BoxGeometry(1,1,1);

// material
mats['ground'] = new THREE[materialType]( {shininess: 10, color:0x3D4143, transparent:true, opacity:0.5 } );


//----------------------------------
//  Duck Model
//----------------------------------
const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
gltfLoader.setDRACOLoader(dracoLoader)
gltfLoader.load(
    '/models/Duck/glTF/Duck.gltf',
    // '/models/Duck/glTF-Binary/Duck.glb', // glTF-Binary
    // '/models/Duck/glTF-Embedded/Duck.gltf', // glTF-Embedded
    (gltf) =>
    {
        console.log('success')
        console.log(gltf)

        const source = gltf.scene;
        world = new World({info:true, worldscale:100} );

        const max = 800;

        // reset old
        clearMesh();
        world.clear();
        bodys=[];

        //add ground
        world.add({size:[40, 40, 390], pos:[-180,20,0], world:world});
        world.add({size:[40, 40, 390], pos:[180,20,0], world:world});
        world.add({size:[400, 80, 400], pos:[0,-40,0], world:world});

        addStaticBox([40, 40, 390], [-180,20,0], [0,0,0]);
        addStaticBox([40, 40, 390], [180,20,0], [0,0,0]);
        addStaticBox([400, 80, 400], [0,-40,0], [0,0,0]);

        //add objects
        let x, y, z, w, h, d;
        let i = max;

        while (i--){
            x = -100 + Math.random()*200;
            z = -100 + Math.random()*200;
            y = 100 + Math.random()*1000;
            w = 10 + Math.random()*10;
            h = 10 + Math.random()*10;
            d = 10 + Math.random()*10;

            bodys[i] = world.add({type:'sphere', size:[w*0.5], pos:[x,y,z], move:true, world:world});
            meshs[i] = SkeletonUtils.clone( source );
            meshs[i].scale.set( w*0.5, w*0.5, w*0.5 );

            meshs[i].castShadow = true;
            meshs[i].receiveShadow = true;

            scene.add( meshs[i] );

        }

        function loop() {
            if (world == null) return;

            world.step();

            var x, y, z, mesh, body, i = bodys.length;

            while (i--) {
                body = bodys[i];
                mesh = meshs[i];

                if (!body.sleeping) {

                    mesh.position.copy(body.getPosition());
                    mesh.quaternion.copy(body.getQuaternion());

                    // reset position
                    if (mesh.position.y < -100) {
                        x = -100 + Math.random() * 200;
                        z = -100 + Math.random() * 200;
                        y = 100 + Math.random() * 1000;
                        body.resetPosition(x, y, z);
                    }
                }
            }
            renderer.render(scene, camera);
            requestAnimationFrame(loop);
        }

        loop()
    },
    (progress) =>
    {
        console.log('progress')
        console.log(progress)
    },
    (error) =>
    {
        console.log('error')
        console.log(error)
    }
)


//----------------------------------
//  Initial Functions
//----------------------------------
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function addStaticBox(size, position, rotation) {
    const mesh = new THREE.Mesh( geos.box, mats.ground );
    mesh.scale.set( size[0], size[1], size[2] );
    mesh.position.set( position[0], position[1], position[2] );
    mesh.rotation.set( rotation[0]*ToRad, rotation[1]*ToRad, rotation[2]*ToRad );
    scene.add( mesh );
    grounds.push(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
}

function clearMesh(){
    let i=meshs.length;
    while (i--) scene.remove(meshs[ i ]);
    i = grounds.length;
    while (i--) scene.remove(grounds[ i ]);
    grounds = [];
    meshs = [];
}

//----------------------------------
//  Textures
//----------------------------------
function gradTexture(color) {
    const c = document.createElement("canvas");
    const ct = c.getContext("2d");
    const size = 1024;
    c.width = 16; c.height = size;
    const gradient = ct.createLinearGradient(0,0,0,size);
    let i = color[0].length;
    while(i--){ gradient.addColorStop(color[0][i],color[1][i]); }
    ct.fillStyle = gradient;
    ct.fillRect(0,0,16,size);
    const texture = new THREE.Texture(c);
    texture.needsUpdate = true;
    return texture;
}

window.addEventListener( 'resize', onWindowResize, false );
