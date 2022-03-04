import { MqttServer } from './mqttServer.js'
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
// import Stats from './jsm/libs/stats.module.js';

let group, group1, group2, mesh2;
let currentObject = null;

const mqttServer = new MqttServer()

let mqttSendDataDom = document.getElementById('mqttSendData')
mqttSendDataDom.addEventListener('click', mqttSendData, false)

let selectFileDom = document.getElementById('selectFile')
selectFileDom.addEventListener('click', selectFile, false)

let loadingConeDom = document.getElementById('loadingCone')
loadingConeDom.addEventListener('click', loadingCone, false)


// 一下是读取excel文件数据函数
let EDTable = []; // 外径数据
let WTTable = []; // 壁厚数据
let CHTable = []; // 高

function selectFile() {
    document.getElementById('file').click();
}
// 读取表格
// 读取本地excel文件
function readWorkbookFromLocalFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        let data = e.target.result;
        let workbook = XLSX.read(data, {type: 'binary'});
        if(callback) callback(workbook);
    };
    reader.readAsBinaryString(file);
}
$(function() {
    document.getElementById('file').addEventListener('change', function(e) {
        let files = e.target.files;
        if(files.length === 0) return;
        let f = files[0];
        if(!/\.xlsx$/g.test(f.name)) {
            alert('仅支持读取xlsx格式！');
            return;
        }
        readWorkbookFromLocalFile(f, function(workbook) {
            readWorkbook(workbook);
        });
    });
});
function readWorkbook(workbook) {
    let sheetNames = workbook.SheetNames; // 工作表名称集合
    let worksheet = workbook.Sheets[sheetNames[0]]; // 这里我们只读取第一张sheet
    console.log('-------------', worksheet)
    let i = 0;
    for (let a in worksheet){
        if ((a.slice(0,1) === 'B' &&  4 < Number(a.slice(1)))) {
            EDTable.push(Number(worksheet[a].v));
            i ++;
        }
        if ((a.slice(0,1) === 'C' &&  4 < Number(a.slice(1)))) {
            WTTable.push(Number(worksheet[a].v));
            i ++;
        }
        if ((a.slice(0,1) === 'D' &&  4 < Number(a.slice(1)))) {
            CHTable.push(Number(worksheet[a].v));
            i ++;
        }
    }
    alert('表格数据读取成功！');
}


let container, stats;

let camera, scene, renderer,controls;



let targetRotation = 0;
// let targetRotationOnPointerDown = 0;
//
// let pointerX = 0;
// let pointerXOnPointerDown = 0;

let windowHalfX = window.innerWidth / 2;



// let mesh2
let mesh3
let mesh4
let arcShape = null
let holePath = null


const data = [
    {ED: 1091.64, WT: 260.80, CH: 344.84},
    {ED: 1096.80, WT: 259.42, CH: 343.84},
    {ED: 1114.85, WT: 257.94, CH: 342.74},
    {ED: 1119.61, WT: 256.60, CH: 341.66},
    {ED: 1123.57, WT: 255.48, CH: 340.06},
    {ED: 1125.66, WT: 253.54, CH: 337.66},
    {ED: 1129.26, WT: 252.20, CH: 336.56},
    {ED: 1141.55, WT: 250.82, CH: 335.58},
    {ED: 1146.31, WT: 249.42, CH: 334.54},
    {ED: 1156.81, WT: 247.34, CH: 332.10},
    {ED: 1166.36, WT: 244.62, CH: 329.40},
    {ED: 1187.95, WT: 240.64, CH: 326.84},
    {ED: 1198.82, WT: 238.46, CH: 324.94},
    {ED: 1210.74, WT: 235.96, CH: 323.22},
    {ED: 1226.00, WT: 233.34, CH: 321.64},
    {ED: 1246.83, WT: 229.60, CH: 318.78},
    {ED: 1260.87, WT: 227.24, CH: 317.08},
    {ED: 1276.19, WT: 224.76, CH: 315.38},
    {ED: 1292.24, WT: 222.36, CH: 313.56},
    {ED: 1313.80, WT: 218.66, CH: 310.68},
    {ED: 1330.90, WT: 216.54, CH: 309.06},
    {ED: 1348.09, WT: 214.28, CH: 307.26},
    {ED: 1371.67, WT: 211.20, CH: 304.54},
    {ED: 1385.85, WT: 208.84, CH: 302.78},
    {ED: 1402.62, WT: 206.58, CH: 301.36},
    {ED: 1427.63, WT: 204.56, CH: 300.12},
    {ED: 1444.14, WT: 201.38, CH: 298.48},
    {ED: 1462.90, WT: 199.04, CH: 297.20},
    {ED: 1478.83, WT: 197.12, CH: 296.00},
    {ED: 1502.71, WT: 194.04, CH: 294.56},
    {ED: 1517.53, WT: 192.14, CH: 293.94},
    {ED: 1535.48, WT: 190.06, CH: 293.42},
    {ED: 1551.47, WT: 188.10, CH: 292.88},
    {ED: 1575.46, WT: 185.54, CH: 292.04},
    {ED: 1593.85, WT: 183.74, CH: 291.56},
    {ED: 1610.49, WT: 181.62, CH: 291.14},
    {ED: 1632.61, WT: 180.10, CH: 291.22},
    // {ED: 0, WT: 0, CH: 0},
]

// 将0.5秒的距离做等距离差分
function numericalSplitProcessing(data) {
    console.log('data',  data)
    let newData = [];
    let l = 0;
    for (let i = 0; i < data.length - 1; i ++){
        for ( let j = 1; j <= 5; j ++){
            newData[l] = {};
            newData[l]['ED'] = ((data[i + 1].ED - data[i].ED) * j / 5) + data[i].ED;
            newData[l]['WT'] = ((data[i + 1].WT - data[i].WT) * j / 5) + data[i].WT;
            newData[l]['CH'] = ((data[i + 1].CH - data[i].CH) * j / 5) + data[i].CH;
            l ++;
        }
    }
    console.log('newData', newData)
    return newData;
}

mqttServer.StartMqttClient();
init();
animate();
// intervalSendMessage();
// let dataee = numericalSplitProcessing(data)
// dynamicChange(dataee)

function intervalSendMessage() {
    let i = 0;
    setInterval(()=>{
        if (i < data.length) {
            mqttServer.sendMessage('ringRollingMachine',JSON.stringify(data[i]))
            i ++
        } else {
            clearInterval();
        }
    },500)
}

function loadTableData() {
    let i = 0;
    setInterval(()=>{
        if (i < EDTable.length) {
            console.log( i );
            loadDataFun( EDTable[i] / 2000, WTTable[i]/1000, CHTable[i] /1000 )
            mesh2.position.set(0, 0.15 + WTTable[i]/1000, 0.5);
            group1.position.set(0, EDTable[i] / 1000 + 0.5, CHTable[i]/1000)
            group2.position.set(0, EDTable[i] / 1000, -Math.sqrt(0.75))
            i ++
        } else {
            clearInterval();
        }
    },500)
}

function dynamicChange(data) {
    let i = 0;
    setInterval(()=>{
        if (i < data.length) {
            console.log( i );
            loadDataFun( data[i].ED / 2000, data[i].WT/1000, data[i].CH/1000 )
            mesh2.position.set(0, 0.15 + data[i].WT/1000, 0.5);
            group1.position.set(0, data[i].ED / 1000 + 0.5, data[i].CH/1000)
            group2.position.set(0, data[i].ED / 1000 + 0.5, 0)
            i ++
        } else {
            clearInterval();
        }
    },100)
}
// function dynamicChange(data) {
// 	let i = 0;
// 	let a =  setInterval(()=>{
// 		console.log('data.length', data.length)
// 		if (i < data.length) {
// 			if(i === 0){
// 				console.log( 'IIIIIIIIII', i );
// 				loadDataFun( data[i].ED / 2000, data[i].WT/1000, data[i].CH/1000 )
// 				mesh2.position.set(0, 0.15 + data[i].WT/1000, 0.5);
// 				group1.position.set(0, data[i].ED / 1000 + 0.5, data[i].CH/1000)
// 				group2.position.set(0, data[i].ED / 1000, -Math.sqrt(0.75))
// 				i ++
// 			} else {
// 				let j = 1;
// 				let b =  setInterval(()=>{
// 					if (j <= 5) {
// 						console.log( 'iiiiiiiiii', i );
// 						console.log( 'JJJJJJJJJ', j );
// 						loadDataFun( (data[i -1].ED + (data[i].ED - data[i - 1].ED) /5 * j )/ 2000, (data[i -1].WT + (data[i].WT - data[i - 1].WT) /5 * j )/1000, (data[i -1].CH + (data[i].CH - data[i - 1].CH) /5 * j )/1000 )
// 						mesh2.position.set(0, 0.15 + (data[i -1].WT + (data[i].WT - data[i - 1].WT) /5 * j )/1000, 0.5);
// 						group1.position.set(0, (data[i -1].ED + (data[i].ED - data[i - 1].ED) /5 * j ) / 1000 + 0.5, (data[i -1].CH + (data[i].CH - data[i - 1].CH) /5 * j )/1000)
// 						group2.position.set(0, (data[i -1].ED + (data[i].ED - data[i - 1].ED) /5 * j ) / 1000, -Math.sqrt(0.75))
// 						j ++
// 					} else {
// 						i ++;
// 						clearInterval(b);
// 						console.log('清楚计时器b')
// 					}
//
// 				},100)
// 			}
// 		} else {
// 			clearInterval(a)
// 			console.log('清楚计时器a')
// 		}
// 	},500)
// }



function loadDataFun(r1, wt, h1) {
    if(parseFloat(wt) <0) {
        alert('壁厚需要大于0！')
        return
    }
    if(parseFloat(wt) >= parseFloat(r1)) {
        alert('壁厚不能大于等于外半径')
        return
    }
    if(parseFloat(r1) === 0) {
        alert('外径需要大于0')
        return
    }
    if(parseFloat(h1) <= 0) {
        alert('高度需要大于0')
        return
    }
    drawObject(parseFloat(r1), parseFloat(wt), parseFloat(h1))
}
function drawObject(r1, wt, depth) {

    const r2 = r1 - wt;
    arcShape = new THREE.Shape().moveTo(1, 1)
        .absarc(0, r1, r1, 0, Math.PI * 2, false);
    holePath = new THREE.Path().moveTo(1, 1)
        .absarc(0, r1, r2, 0, Math.PI * 2, true);
    // .absarc( x, y, 半径, 星形缠绕, 端角, 顺时针 );
    arcShape.holes.push(holePath);
    const extrudeSettings = {
        depth: depth,
        curveSegments: 64,
        bevelEnabled: true,
        bevelSegments: 10, // 斜角
        steps: 32,
        bevelSize: 0.0001,
        bevelThickness: 0
    };
    addShape(arcShape, extrudeSettings, 0xE6A23C, 0, 100, 0, 0, 0, 0, 1);
}
function addShape(shape, extrudeSettings, color, x, y, z, rx, ry, rz, s) {
    let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // geometry.center();
    if(currentObject) {
        currentObject.geometry.dispose()
        currentObject.geometry = geometry
    } else {
        const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: color }));
        mesh.name = '空心圆柱体'
        group.add(mesh);
        currentObject = mesh
    }

    window.currentObject = currentObject
    window.scene = scene
}
function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(4, 0, 2);
    camera.up.set(0, 0, 1)
    scene.add(camera);

    const light = new THREE.PointLight(0xffffff, 0.8);
    camera.add(light);

    // // 添加不动的体
    const geometryCylinder = new THREE.CylinderGeometry( 0.5375, 0.5375, 1, 64 );
    const materialCylinder = new THREE.MeshPhongMaterial( { color: 0x909399 } );

    let mesh1 = new THREE.Mesh( geometryCylinder, materialCylinder );
    mesh1.castShadow = true;
    mesh1.receiveShadow = true;
    mesh1.position.set(0, -0.5375, 0.5);
    mesh1.rotation.set(Math.PI * 0.5, 0, 0);
    mesh1.name = '不动圆柱体'
    scene.add( mesh1 );
    window.mesh1 = mesh1;

    // 添加挤压体
    const geometryCylinder2 = new THREE.CylinderGeometry( 0.15, 0.15, 1, 64 );
    const materialCylinder2 = new THREE.MeshPhongMaterial( { color: 0x606266 } );

    mesh2 = new THREE.Mesh( geometryCylinder2, materialCylinder2 );
    mesh2.castShadow = true;
    mesh2.receiveShadow = true;
    mesh2.position.set(0, 0.45, 1.5);
    mesh2.rotation.set(Math.PI * 0.5, 0, 0);
    mesh2.name = '挤压圆柱体'
    scene.add( mesh2 );
    window.mesh2 = mesh2;

    loadingCone()



    group = new THREE.Group();
    scene.add(group);


    scene.add(new THREE.AxesHelper(1));
    // scene.add(new THREE.AxisHelper(1s));


    // console.log('scene', scene);
    // const loader = new THREE.TextureLoader();
    // const texture = loader.load('textures/uv_grid_opengl.jpg');
    //
    // // it's necessary to apply these settings in order to correctly display the texture on a shape geometry
    //
    // texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    // texture.repeat.set(0.008, 0.008);


    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    controls = new OrbitControls( camera, renderer.domElement );

    window.addEventListener('resize', onWindowResize);
    drawObject(data[0].ED / 2000, data[0].WT/1000, data[0].CH/1000)
}

function loadingCone(r, h, x ,z) {
    let coneRadius;
    let coneHeight;
    let coneY;
    let coneZ;
    if (r && h){
        coneRadius = r;
        coneHeight = h;

    } else {
        coneRadius = document.getElementById('coneRadius').value;
        coneHeight = document.getElementById('coneHeight').value;
    }
    if(x && z){
        coneY = y;
        coneZ = z;
    } else {
        // coneY = data[0].ED / 1000;
        // coneZ = data[0].CH / 1000;
        coneY = 2;
        coneZ = 1;
    }

    // 上锥体

    let geometryCylinder3 = new THREE.CylinderGeometry( 0, coneRadius,coneHeight, 64 );
    if (mesh3) {
        mesh3.geometry.dispose();
        mesh3.geometry = geometryCylinder3
    } else {
        group1 = new THREE.Group();
        scene.add(group1);
        const materialCylinder3 = new THREE.MeshPhongMaterial( { color: 0xfd1111 } );
        mesh3 = new THREE.Mesh( geometryCylinder3, materialCylinder3 );
        mesh3.castShadow = true;
        mesh3.receiveShadow = true;
        group1.add( mesh3 );
        group1.position.set(0, coneY + 0.5, coneZ);
    }
    // // 将上锥体摆正并且 让group的点在锥体底圆的圆弧上
    mesh3.position.set(0, coneRadius, coneHeight/2);
    mesh3.rotation.set(Math.PI * 0.5, 0, 0);
    // group1用于规定模型的整体旋转角度

    group1.rotation.set(Math.PI * 0.5 + Math.atan(coneRadius/coneHeight), 0, 0)

    // 下锥体

    let geometryCylinder4 = new THREE.CylinderGeometry( 0, coneRadius,coneHeight, 64 );
    if (mesh4) {
        mesh4.geometry.dispose();
        mesh4.geometry = geometryCylinder4
    } else {
        group2 = new THREE.Group();
        scene.add(group2);
        const materialCylinder4 = new THREE.MeshPhongMaterial( { color: 0xfd1111 } );
        mesh4 = new THREE.Mesh( geometryCylinder4, materialCylinder4 );
        mesh4.castShadow = true;
        mesh4.receiveShadow = true;
        group2.add( mesh4 );
        group2.position.set(0, coneY + 0.5, 0)
    }
    // // 将上锥体摆正并且 让group的点在锥体底圆的圆弧上
    mesh4.position.set(0, -coneRadius, coneHeight/2);
    mesh4.rotation.set(Math.PI * 0.5, 0, 0);
    // group1用于规定模型的整体旋转角度
    group2.rotation.set(Math.PI * 0.5 - Math.atan(coneRadius/coneHeight), 0, 0)

}
function clickLoadDataFun() {
    let r1 = document.getElementById('externalDiameter').value
    // let r2 = document.getElementById('wallThickness').value
    let wt = document.getElementById('wallThickness').value
    let h1 = document.getElementById('cylinderHeight').value

    if(parseFloat(wt) <0) {
        alert('壁厚需要大于0！')
        return
    }
    if(parseFloat(wt) >= parseFloat(r1)) {
        alert('壁厚不能大于等于外半径')
        return
    }
    if(parseFloat(r1) === 0) {
        alert('外径需要大于0')
        return
    }
    if(parseFloat(h1) <= 0) {
        alert('高度需要大于0')
        return
    }
    drawObject(parseFloat(r1), parseFloat(wt), parseFloat(h1))
}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate() {

    requestAnimationFrame(animate);

    render();


    // mesh1.rotation.y += 1 / Math.PI
    // stats.update();

}

function render() {

    group.rotation.y += (targetRotation - group.rotation.y) * 0.05;
    renderer.render(scene, camera);

}


function loadMqttData(topic, payload) {
    console.log('返回来啦',topic, payload)
    console.log(Number(payload.ED), Number(payload.WT), Number(payload.CH))
    loadDataFun( Number(payload.ED) / 2000, Number(payload.WT)/1000, Number(payload.CH) / 1000 )
    mesh2.position.set(0, 0.15 + Number(payload.WT) / 1000, 0.5);
    console.log('李显1')
    group1.position.set(0, Number(payload.ED) / 1000 + 0.5, Number(payload.CH) / 1000)
    console.log('李显2')
    group2.position.set(0, Number(payload.ED) / 1000 + 0.5, 0)
    console.log('李显3')
    // if(topic === 'ringRollingMachine') {
    //
    // }
}

export {
    loadMqttData
}
