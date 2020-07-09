init();



function init() {


    // 初回のvideoエレメントのリサイズが行われたか
    var is_first_resize = false;

    // glbファイルのアニメーション用にmixerとclockを用意
    var mixer;
    var clock = new THREE.Clock();

    // シーンファイルを作成
    var scene = new THREE.Scene();

    // レンダラを作成
    var renderer = new THREE.WebGLRenderer({
        //canvas: document.querySelector('#myCanvas'),
        antialias: true,
        alpha: true,
    });
    renderer.setClearColor(new THREE.Color("black"), 0);
    renderer.setSize(640, 480);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0px";
    renderer.domElement.style.left = "0px";
    renderer.domElement.style.zIndex = 1;
    document.body.appendChild( renderer.domElement );


    // ARカメラの設定
    var source = new THREEx.ArToolkitSource({
        sourceType: "webcam",
    });
    
    source.init(function onReady() {
        // videoタグが埋め込まれるタイミングが遅いのでリサイズ処理を2秒遅延させる
        setTimeout(() => { 
            onResize();
            is_first_resize = true;
        }, 2000);
    });
    // コンテキストを作成
    var context = new THREEx.ArToolkitContext({
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
	

    window.addEventListener("resize", function() {
        onResize();
    });

    // リサイズ用関数
    function onResize() {
        source.onResizeElement();
        source.copyElementSizeTo(renderer.domElement);
        if (context.arController !== null) {
            source.copyElementSizeTo(context.arController.canvas);
        } 
    }

    // カメラを作成し、シーンに追加
    var camera = new THREE.Camera(60, renderer.domElement.innerWidth / renderer.domElement.innerHeight);
    scene.add(camera);

    // マーカーを作成
    // スムースを有効にする
    var marker = new THREE.Group();
    var controls = new THREEx.ArMarkerControls(context, marker, {
        type: "pattern",
        patternUrl: "./data/mymarker.patt",
            smooth: true,
            smoothCount: 2,
            smoothTolerance: 0.000001,
            smoothThreshold: 0.00001,
    });
    scene.add(marker);

    // ライトをシーンに追加
    var dirLight1 = new THREE.DirectionalLight(0xffffff);
    dirLight1.position.set(1, 1.5, 2);
    scene.add(dirLight1);
    var dirLight2 = new THREE.DirectionalLight(0xffffff);
    dirLight2.position.set(-1, -1.5, 2);
    scene.add(dirLight2);
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);


    // arオブジェクトをまとめるためのグループを作成
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

    // グループごとマーカーにadd
    marker.add(group);

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
                });
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
            
    
            obj.scale.set(scale, scale, scale);
            group.add(obj);
            loadcount++;   
        });
    }

    // シーンの描画
    // mixerがnullでなければアニメーションさせる
    function renderScene() {
        requestAnimationFrame(renderScene);
        if(source.ready === false) {return;}
        context.update(source.domElement);
        renderer.render(scene, camera);

        // Animation Mixerを実行
        if(mixer){
            mixer.update(clock.getDelta());
        }
    }
    // コンテンツのロードおよびvideoタグがリサイズされているかチェックし、
    // されていればロード画面を消す
    function loadCheck() {
        if (is_first_resize) {
            $("#load-plane").animate({ opacity: 0 }, { duration: 500, easing: 'linear' });
        } else {
            requestAnimationFrame(loadCheck);
        }
    }

    renderScene();
    loadCheck();
}