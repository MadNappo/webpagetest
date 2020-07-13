init();



function init() {

    const DISPLAY_MODE = {
        AR: 0,
        VIEWER: 1,
    };
    var mode = DISPLAY_MODE.AR;

    // 対象のファイルパスなどの保持用
    var path;
    var files;
    var scale;
    var loadcount = 0;

    // コンテンツを追加する際のターゲット(markerかsceneか)
    var target;

    // URLのパラメータを取得
    var urlParam = location.search.substring(1);
    
    // URLにパラメータが存在する場合
    if(urlParam) {
        // 「&」が含まれている場合は「&」で分割
        var param = urlParam.split('&');
        
        // パラメータを格納する用の配列を用意
        var paramArray = [];
        
        // 用意した配列にパラメータを格納
        for (i = 0; i < param.length; i++) {
            var paramItem = param[i].split('=');
            paramArray[paramItem[0]] = paramItem[1];
        }
        

        switch(paramArray.mode) {
            case 'ar':
                mode = DISPLAY_MODE.AR;
                break;
            case 'viewer':
                mode = DISPLAY_MODE.VIEWER;
                break;
            default:
                mode = DISPLAY_MODE.AR;
                break;
        }
    } else {    
        mode = DISPLAY_MODE.AR;
    }




    // 初回のvideoエレメントのリサイズが行われたか
    // ロードにカウントするので整数値
    var is_first_resize = 0;

    // glbファイルのアニメーション用にmixerとclockを用意
    var mixer;
    var clock = new THREE.Clock();

    // シーンファイルを作成
    var scene = new THREE.Scene();

    // レンダラを作成
    var renderer;
    // ARモードとVIEWERモードで内容を変える
    if (mode === DISPLAY_MODE.AR) { // ARの場合
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setClearColor(new THREE.Color("black"), 0);
        renderer.setSize(640, 480);
    } else { // VIEWERの場合
        renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        scene.background = new THREE.Color(0xC0C0C0);
    }
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0px";
    renderer.domElement.style.left = "0px";
    renderer.domElement.style.zIndex = 1;
    document.body.appendChild( renderer.domElement );

    // AR特有の設定
    var source;
    var context;
    var controls;
    if (mode === DISPLAY_MODE.AR) {

        // ARカメラの設定
        source = new THREEx.ArToolkitSource({
            sourceType: "webcam",
        });
        
        source.init(function onReady() {
            // videoタグが埋め込まれるタイミングが遅いのでリサイズ処理を2秒遅延させる
            setTimeout(() => { 
                onResize();
                is_first_resize = 1;
            }, 2000);
        });
        // コンテキストを作成
        context = new THREEx.ArToolkitContext({
            debug: false,
            cameraParametersUrl: "./data/camera_para.dat",
            detectionMode: "mono",
            imageSmoothingEnabled: true,
            maxDetectionRate: 60, 
            patternRatio: 0.5,
            labelingMode: 'black_region',
        });
        context.init(function onCompleted(){
            camera.projectionMatrix.copy(context.getProjectionMatrix());
        });
        
        // マーカーを作成
        // スムースを有効にする
        var marker = new THREE.Group();
        controls = new THREEx.ArMarkerControls(context, marker, {
            type: "pattern",
            patternUrl: "./data/mymarker.patt",
            smooth: true,
            smoothCount: 3,
            smoothTolerance: 0.000001,
            smoothThreshold: 0.000001,
        });
        scene.add(marker);
        target = marker;
    } else {
        target = scene;
        is_first_resize = 1;
    }

    var cam_ctrl;
    // カメラを作成し、シーンに追加
    var camera = new THREE.PerspectiveCamera(60, renderer.domElement.innerWidth / renderer.domElement.innerHeight);
    // VIWERの場合はオービットコントロールを作成する
    if (mode === DISPLAY_MODE.VIEWER) {
        camera.position.set(0, 0, 2);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        // カメラコントローラを作成
        cam_ctrl = new THREE.OrbitControls(camera, renderer.domElement);
        // なめらかにカメラコントロールを制御する
        cam_ctrl.minAzimuthAngle = -Math.PI/5; 
        cam_ctrl.maxAzimuthAngle = Math.PI/5;
        cam_ctrl.minPolarAngle = Math.PI/2 - Math.PI/5;
        cam_ctrl.maxPolarAngle = Math.PI/2 + Math.PI/5;
        cam_ctrl.enableDamping = true;
        cam_ctrl.dampingFactor = 0.2;
        cam_ctrl.rotateSpeed =0.5;
        cam_ctrl.enablePan = false;
        cam_ctrl.minDistance = 1.0;
        cam_ctrl.maxDistance = 4.0;
        cam_ctrl.minZoom = 1.0;
        cam_ctrl.maxZoom = 4.0;
        cam_ctrl.target.set(0, 0, 0);
    }
    scene.add(camera);



    // ライトをシーンに追加
    var dirLight1 = new THREE.DirectionalLight(0xffffff);
    dirLight1.intensity = 0.4;
    dirLight1.position.set(0.5, 0.5, 3);
    scene.add(dirLight1);
    var dirLight2 = new THREE.DirectionalLight(0xffffff);
    dirLight2.intensity = 0.5;
    dirLight2.position.set(-1.5, -1.5,  3);
    scene.add(dirLight2);
    var dirLight3 = new THREE.DirectionalLight(0xffffff);
    dirLight3.intensity = 0.5;
    dirLight3.position.set(1.5, 1.5,  2);
    scene.add(dirLight3);
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);


    // 表示オブジェクトをまとめるためのグループを作成
    var group = new THREE.Group();


    var cube_size = 1;
    var geometry = new THREE.BoxGeometry(cube_size, cube_size, cube_size);
    // 6面分のmaterialを設定
    var materials = [
    new THREE.MeshLambertMaterial({color: 0xE9546B}), // right
    new THREE.MeshLambertMaterial({color: 0xE9546B}), // left
    new THREE.MeshLambertMaterial({color: 0x00A95F}), // front
    new THREE.MeshLambertMaterial({color: 0x00A95F}), // back
    new THREE.MeshLambertMaterial({color: 0x187FC4}), // top
    new THREE.MeshLambertMaterial({color: 0x187FC4}), // bottom
    ];
    var cube = new THREE.Mesh( geometry, materials );
    cube.position.set(0, 0.5, 0);
    group.add(cube);
    loadcount = 1;

    // グループごとターゲットにadd
    target.add(group);

    // objファイルの読み込み関数
    // objファイルを読み込みgroupに追加する
    function loadObjFile(group, filepath, filename, scale) {
        new THREE.MTLLoader().setPath(filepath).load(filename + '.mtl', function(materials){
            materials.preload();          
            new THREE.OBJLoader().setPath(filepath).setMaterials(materials).load(filename + '.obj', function(object){ 
                object.scale.set(scale, scale, scale);
                object.children.forEach(function(child){
                    child.material.flatShading = false;
                    //child.material.shading = THREE.SmoothShading;
                    child.material.envMap = textureCube;
                    //child.material.side = THREE.DoubleSide;
                });
                if (mode === DISPLAY_MODE.VIEWER) {
                    object.rotation.set(Math.PI/2, Math.PI/2, 0);
                }
                group.add(object);
                loadcount++;
            });     
        })
    }

    // glbファイルの読み込み関数
    // glbファイルを読み込みgroupに追加する
    // アニメーションがある場合はmixerに設定する
    function loadGlbFile(group, filepath, filename, scale) {
        new THREE.GLTFLoader().load(filepath + filename + '.glb', function(data){
            var gltf = data;
            var obj = gltf.scene;
            var animations = gltf.animations;
    
            if (animations && animations.length) {
                // Animation Mixerインスタンスを生成
                mixer = new THREE.AnimationMixer(obj);
    
                // 全てのAnimation Clipに対して
                for (let i = 0; i < animations.length; i++) {
                    let animation = animations[i];
    
                    // Animation Actionを生成
                    let action = mixer.clipAction(animation);
    
                    // ループ設定
                    action.setLoop(THREE.LoopRepeat);
    
                    // アニメーションの最後のフレームでアニメーションが終了
                    action.clampWhenFinished = true;
                       
                    // アニメーションを再生
                    action.play();   
                }
            }
            
            obj.traverse((o) => {
                if (o.isMesh) {
                    o.material.envMap = textureCube;
                }
            });
    
            obj.scale.set(scale, scale, scale);
            if (mode === DISPLAY_MODE.VIEWER) {
                obj.rotation.set(Math.PI/2, Math.PI/2, 0);
            }
            group.add(obj);
            loadcount++;   
        });
    }

    // シーンの描画
    // mixerがnullでなければアニメーションさせる
    function renderScene() {
        requestAnimationFrame(renderScene);
        if (mode === DISPLAY_MODE.AR) {
            if(source.ready === false) {return;}
            context.update(source.domElement);
        } else {
            // カメラコントローラを更新
            cam_ctrl.update();
        }
        renderer.render(scene, camera);

        // Animation Mixerを実行
        if(mixer){
            mixer.update(clock.getDelta());
        }
    }

    var tmp_count = 0;
    var count = 0;
    // コンテンツのロードおよびvideoタグがリサイズされているかチェックし、
    // されていればロード画面を消す
    function loadCheck() {
        count = loadcount + is_first_resize;
        if (tmp_count !== count) {
            $("#load-count").animate(
                { width: (count / (1 + 1)) * 100 + "%"},
                { duration: 300, easing: 'swing'}
            );
            tmp_count = count;
        }
        if (loadcount >= 1 && is_first_resize == 1) {
            setTimeout(() => {
                $("#load-plane").animate({ opacity: 0, }, 500, 'linear', () => {$("#load-plane").css('z-index', -1)});
            }, 300);
        } else {
            requestAnimationFrame(loadCheck);
        }
    }

    //　リサイズ処理周り
    window.addEventListener("resize", function() {
        onResize();
    });
    // リサイズ用関数
    function onResize() {
        if (mode === DISPLAY_MODE.AR) {
            source.onResizeElement();
            source.copyElementSizeTo(renderer.domElement);
            if (context.arController !== null) {
                source.copyElementSizeTo(context.arController.canvas);
            } 
        } else {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }


    // 描画処理とロード監視を呼ぶ
    renderScene();
    loadCheck();
    onResize();
}