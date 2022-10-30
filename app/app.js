import { DropImport } from "./import.js";
import { numberPrompt } from "./prompt.js";

const WIDTH = 1280;
const HEIGHT = 720;
const SNAP_DIST = 15;

const canvas = document.getElementById("main");
var _canvasWidth = window.innerWidth;
var _canvasHeight = window.innerHeight;

canvas.width = Math.floor(_canvasWidth * window.devicePixelRatio);
canvas.height = Math.floor(_canvasHeight * window.devicePixelRatio);
canvas.style.width = `${_canvasWidth}px`;
canvas.style.height = `${_canvasHeight}px`;

var canvasWidth = WIDTH;
var canvasHeight = HEIGHT;

const ctx = canvas.getContext("2d");
const name_field = (function() {
    const field = document.getElementById("name-field");
    const node = document.createTextNode("");
    field.appendChild(node);

    return node;
})();

var images = [];

class Frame {
    constructor(img, x, y) {
        this.img = img.data;
        this.name = img.name;
        this.x = x;
        this.y = y;
        this.id = -1;
        this.width = this.img.width;
        this.height = this.img.height;
    }
}

var selectedImages = [];

var selectionBounds = null;
var imageOffsets = new Map(); // offsets from selection bounds top left

var mouseButton = [false, false, false];
var mouse_ox = 0;
var mouse_oy = 0;

// middle click drag
var drag_x = 0;
var drag_y = 0;
var offset_sx = 0;
var offset_sy = 0;
var offset_x = 0;
var offset_y = 0;

// box select
var boxselect_sx = 0;
var boxselect_sy = 0;
var boxselect_ex = 0;
var boxselect_ey = 0;
var dragMode = 0;

var mouse_x = 0;
var mouse_y = 0;
// 0 = none
// 1 = drag
// 2 = box select
var hover_image = null;

var isPrompt = false;

var checkerboard = document.createElement("canvas");

// draw checkerboard
function generateCheckerboard() {
    const _canvas = checkerboard
    _canvas.width = canvas.width;
    _canvas.height = canvas.height;

    const ctx = _canvas.getContext("2d");

    // draw checkerboard pattern
    for (let x = 0; x < _canvas.width / 8; x++) {
        for (let y = 0; y < _canvas.height / 8; y++) {
            if ((x+y) % 2 == 0) {
                ctx.fillStyle = "white";
            } else {
                ctx.fillStyle = "rgb(200, 200, 200)";
            }

            ctx.fillRect(x*8, y*8, 8, 8);
        }
    }
}
generateCheckerboard();

window.onresize = () => {
    _canvasWidth = window.innerWidth;
    _canvasHeight = window.innerHeight;

    canvas.width = Math.floor(_canvasWidth * window.devicePixelRatio);
    canvas.height = Math.floor(_canvasHeight * window.devicePixelRatio);
    canvas.style.width = `${_canvasWidth}px`;
    canvas.style.height = `${_canvasHeight}px`;

    generateCheckerboard();
    draw();
}

function pointInRect(x, y, a, b, w, h) {
    return x > a && y > b && x < a + w && y < b + h
}

function getNextId() {
    var nextId = 0;

    for (let img of images) {
        nextId = Math.max(img.id + 1, nextId);
    }

    return nextId;
}

function getExtents(images) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;

    for (let img of images) {
        minX = Math.min(minX, img.x);
        minY = Math.min(minY, img.y);

        maxX = Math.max(maxX, img.x + img.width);
        maxY = Math.max(maxY, img.y + img.height);
    }

    return { left: minX, top: minY, right: maxX, bottom: maxY };
}

const dropImport = new DropImport((arg) => {
    var id = getNextId();
    var offset = 0;

    for (let imgData of arg) {
        let img = new Frame(imgData, mouse_x + offset, mouse_y + offset);
        img.id = id;
        images.push(img);

        //offset += 5;
        id++;
    }

    draw();
});

function draw() {
    ctx.resetTransform();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(-offset_x, -offset_y, canvasWidth, canvasHeight);
    ctx.clip();
    
    ctx.drawImage(checkerboard, 0, 0);
    ctx.restore();

    ctx.translate(-offset_x, -offset_y);
    
    // draw images
    ctx.font = "12px monospace";
    ctx.textBaseline = "top";

    for (let img of images) {
        if (selectedImages.includes(img)) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgb(0, 100, 255)";
        } else {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
            ctx.lineWidth = 1;
        }

        ctx.drawImage(img.img, img.x, img.y);
        ctx.strokeRect(img.x, img.y, img.width, img.height);
        
        ctx.textBaseline = "top";
        ctx.font = "12px monospace";

        let label = `${img.id}: ${img.name}`;
        let metrics = ctx.measureText(label);

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(img.x, img.y, metrics.width, 12);

        ctx.fillStyle = "white";
        ctx.fillText(label, img.x, img.y);
    }

    // draw box select
    if (dragMode === 2) {
        ctx.fillStyle = "rgba(0, 128, 255, 0.2)";
        ctx.strokeStyle = "rgb(0, 128, 255)";
        ctx.lineWidth = 1;

        var args = [
            Math.min(boxselect_sx, boxselect_ex),
            Math.min(boxselect_sy, boxselect_ey),
            Math.abs(boxselect_ex - boxselect_sx),
            Math.abs(boxselect_ey - boxselect_sy)
        ];

        ctx.fillRect(...args);
        ctx.strokeRect(...args);
    } else {
        if (hover_image) {
            ctx.textBaseline = "bottom";
            ctx.font = "12px monospace";

            let label = `${hover_image.id}: ${hover_image.name}`;
            let metrics = ctx.measureText(label);

            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(mouse_x + 12, mouse_y - 12, metrics.width, 12);

            ctx.fillStyle = "white";
            ctx.fillText(label, mouse_x + 12, mouse_y);
        }
    }
}

function mousedown(ev) {
    ev.preventDefault();

    var mouseX = ev.pageX - canvas.offsetLeft + offset_x;
    var mouseY = ev.pageY - canvas.offsetTop + offset_y;

    mouseButton[ev.button] = true;

    // left click
    if (ev.button === 0) {
        boxselect_sx = mouseX;
        boxselect_sy = mouseY;
        draw();
    }

    // middle click
    else if (ev.button === 1) {
        drag_x = mouseX - offset_x;
        drag_y = mouseY - offset_y;

        offset_sx = offset_x;
        offset_sy = offset_y;
    }
}

function mousemove(ev) {
    var mouseX = ev.pageX - canvas.offsetLeft + offset_x;
    var mouseY = ev.pageY - canvas.offsetTop + offset_y;
    var needRefresh = false;

    mouse_x = mouseX;
    mouse_y = mouseY;

    var hoverImage = null;
    
    ev.preventDefault();

    for (let img of images) {
        name_field.nodeValue = "";

        if (pointInRect(mouseX, mouseY, img.x, img.y, img.width, img.height)) {
            hoverImage = img;
            break;
        }
    }

    hover_image = hoverImage;

    var distToStart = (boxselect_sx-mouseX)**2 + (boxselect_sy-mouseY)**2;

    if (mouseButton[0] && (dragMode > 0 || (distToStart > 4))) {
        if (dragMode === 1 || (dragMode === 0 && hoverImage)) {
            needRefresh = true;

            if (dragMode === 0) {
                if (!selectedImages.includes(hoverImage)) {
                    images.splice(images.indexOf(hoverImage), 1);
                    images.unshift(hoverImage);

                    if (!ev.ctrlKey) selectedImages = [];
                    selectedImages.push(hoverImage);
                }
            }

            if (!selectionBounds) {
                selectionBounds = getExtents(selectedImages);
                imageOffsets.clear();

                for (let img of selectedImages) {
                    imageOffsets.set(img, {
                        x: img.x - selectionBounds.left,
                        y: img.y - selectionBounds.top
                    });
                }

                mouse_ox = mouseX - selectionBounds.left;
                mouse_oy = mouseY - selectionBounds.top;
            }

            var targetX = mouseX - mouse_ox;
            var targetY = mouseY - mouse_oy;

            var finalX = targetX;
            var finalY = targetY;

            var boundsWidth = selectionBounds.right - selectionBounds.left;
            var boundsHeight = selectionBounds.bottom - selectionBounds.top;

            // snap to nearest image edge
            finalX = targetX;
            finalY = targetY;

            // left edge of canvas
            if (Math.abs(targetX) < SNAP_DIST) {
                finalX = 0;
            }

            // top edge of canvas
            if (Math.abs(targetY) < SNAP_DIST) {
                finalY = 0;
            }

            for (let img of images) {
                if (!selectedImages.includes(img)) {
                    // left edge of other
                    if (Math.abs(img.x - (targetX + boundsWidth)) < SNAP_DIST) {
                        finalX = img.x - boundsWidth
                    }

                    // right edge of other
                    if (Math.abs((img.x + img.width) - targetX) < SNAP_DIST) {
                        finalX = img.x + img.width;
                    }

                    // bottom edge of other
                    if (Math.abs((img.y + img.height) - targetY) < SNAP_DIST) {
                        finalY = img.y + img.height;
                    }

                    // top edge of other
                    if (Math.abs(img.y - (targetY + boundsHeight)) < SNAP_DIST) {
                        finalY = img.y - boundsHeight
                    }
                }
            }

            for (let img of selectedImages) {
                img.x = finalX + imageOffsets.get(img).x;
                img.y = finalY + imageOffsets.get(img).y;
            }

            dragMode = 1;
        } else {
            selectedImages = [];

            let x_min = Math.min(boxselect_sx, boxselect_ex);
            let y_min = Math.min(boxselect_sy, boxselect_ey);
            let x_max = Math.max(boxselect_sx, boxselect_ex);
            let y_max = Math.max(boxselect_sy, boxselect_ey);

            for (let img of images) {
                if (
                    img.x < x_max &&
                    img.x + img.width > x_min &&
                    img.y < y_max &&
                    img.y + img.height > y_min
                ) {
                    selectedImages.push(img);
                }
            }

            boxselect_ex = mouseX;
            boxselect_ey = mouseY;
            
            needRefresh = true;
            dragMode = 2;
        }
    }

    // dragging
    if (mouseButton[1]) {
        offset_x = drag_x - (mouseX - offset_x) + offset_sx;
        offset_y = drag_y - (mouseY - offset_y) + offset_sy;

        needRefresh = true;
    }

    draw();
}

function mouseup(ev) {
    mouseButton[ev.button] = false;

    var mouseX = ev.pageX - canvas.offsetLeft + offset_x;
    var mouseY = ev.pageY - canvas.offsetTop + offset_y;

    if (ev.button === 0) {
        if (dragMode === 0) {
            // select image
            if (!ev.ctrlKey)
                selectedImages = [];

            for (let img of images) {
                if (pointInRect(mouseX, mouseY, img.x, img.y, img.width, img.height)) {
                    let idx = selectedImages.indexOf(img);

                    if (idx >= 0) {
                        selectedImages.splice(idx, 1);
                    } else {
                        selectedImages.push(img);
                    }
                    
                    break;
                }
            }
        }

        dragMode = 0;

        selectionBounds = null;
        imageOffsets.clear();

        draw();
    }
}

function keydown(ev) {
    if (isPrompt) {
        return;
    }

    console.log(ev.code);

    if (ev.code === "Backspace") {
        ev.preventDefault();

        for (let selectedImage of selectedImages) {
            images.splice(images.indexOf(selectedImage), 1);
        }
        draw();
    }
}

draw();

canvas.addEventListener("mousedown", mousedown);
canvas.addEventListener("mousemove", mousemove);
canvas.addEventListener("mouseup", mouseup);
window.addEventListener("keydown", keydown);

function createImage() {
    const renderResult = document.createElement("canvas");
    renderResult.width = canvasWidth;
    renderResult.height = canvasHeight;
    const ctx = renderResult.getContext("2d");

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let img of images) {
        ctx.drawImage(img.img, img.x, img.y);
    }

    return renderResult;
}

function toBlob(canvas, ...args) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(resolve, ...args);
    })
}

function saveBinary() {
    return new Promise((resolve, reject) => {
        const renderResult = document.createElement("canvas");
        renderResult.width = canvasWidth;
        renderResult.height = canvasHeight;
        const ctx = renderResult.getContext("2d");

        var metadata = "return{";

        var sorted = [...images];
        sorted.sort((a, b) => a.id - b.id);

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        for (let img of sorted) {
            ctx.drawImage(img.img, img.x, img.y);
            metadata += `[${img.id}]={x=${img.x},y=${img.y},w=${img.width},h=${img.height}},`;
        }

        metadata += "}";

        console.log(metadata);

        (async() => {
            var res_blob = await toBlob(renderResult);
            var res_arr = new Uint8Array(await res_blob.arrayBuffer());

            var meta_len = 0;
            
            for (let img of sorted) {
                meta_len += 20;
                meta_len += img.name.length + 1;
            }

            var mergedData = new Uint8Array(4 + res_blob.size + 4 + meta_len);
            var dataView = new DataView(mergedData.buffer)
            dataView.setInt32(0, res_arr.byteLength, true);

            mergedData.set(res_arr, 4);

            var offset = res_blob.size + 4;
            dataView.setInt32(offset, sorted.length, true);
            offset += 4;

            for (let img of sorted) {
                dataView.setInt32(offset, img.id, true);
                dataView.setInt32(offset+4, img.x, true);
                dataView.setInt32(offset+8, img.y, true);
                dataView.setInt32(offset+12, img.width, true);
                dataView.setInt32(offset+16, img.height, true);
                offset += 20;

                // encode name string
                for (let i = 0; i < img.name.length; i++) {
                    dataView.setUint8(offset, img.name.charCodeAt(i));
                    offset++;
                }

                dataView.setUint8(offset, 0);
                offset++;
            }
            
            resolve(mergedData.buffer);
        })();
    });
}

appControls.new(() => {
    images = [];
    draw();
})

appControls.save((type) => {
    return new Promise((resolve, reject) => {
        if (type === ".json") {
            console.log("save as JSON");

            var jsonData = {};
            jsonData.width = canvasWidth;
            jsonData.height = canvasHeight;
            jsonData.images = [];

            for (let img of images) {
                jsonData.images.push({
                    id: img.id,
                    name: img.name,
                    img: img.img.src,
                    x: img.x,
                    y: img.y,
                })
            }

            // save as file
            var textEncoder = new TextEncoder();
            resolve(textEncoder.encode(JSON.stringify(jsonData)).buffer);
        } else if (type === ".atlas") {
            saveBinary().then(resolve);
        } else {
            reject("Unknown file type");
        }
    });
});

appControls.open((ev, data, type) => {
    if (type === ".json") {
        var textDecoder = new TextDecoder();
        let jsonData = JSON.parse(textDecoder.decode(data));
        console.log(jsonData);

        images = [];
        canvasWidth = jsonData.width;
        canvasHeight = jsonData.height;

        for (let img of jsonData.images) {
            let imgData = document.createElement("img");
            imgData.onload = function() {
                let obj = new Frame({data: imgData, name: img.name}, img.x, img.y);
                obj.id = img.id;

                images.push(obj);
                draw();
            }
            imgData.src = img.img;

        }
    }

    else if (type === ".atlas") {
        const dataView = new DataView(data.buffer);
        const littleEndian = true;

        const pngSize = dataView.getInt32(0, littleEndian);
        const pngData = data.subarray(4, pngSize+4);
        let meta = [];

        const metaStart = pngSize+4;
        const numSlices = dataView.getInt32(metaStart, littleEndian);

        let offset = metaStart+4;

        for (let i = 0; i < numSlices; i++) {
            let dat = {
                id: dataView.getInt32(offset, littleEndian),
                x: dataView.getInt32(offset + 4, littleEndian),
                y: dataView.getInt32(offset + 8, littleEndian),
                w: dataView.getInt32(offset + 12, littleEndian),
                h: dataView.getInt32(offset + 16, littleEndian),
                name: "",
            };

            offset += 20;

            // read name
            for (; dataView.getUint8(offset) !== 0; offset++) {
                dat.name += String.fromCharCode(dataView.getUint8(offset));
            }

            offset++;

            meta.push(dat);
        }

        var img = document.createElement("img");
        
        images = [];
        img.onload = () => {
            canvasWidth = img.width;
            canvasHeight = img.height;

            for (let data of meta) {
                let canvas = document.createElement("canvas");
                canvas.width = data.w;
                canvas.height = data.h;
                
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, data.x, data.y, data.w, data.h, 0, 0, data.w, data.h);

                let frame = new Frame({ name: data.name, data: canvas }, data.x, data.y);
                frame.id = data.id;
                images.push(frame);
            }

            draw();
        }
        
        var pngDatStr = "";
        for (let i = 0; i < pngData.length; i++) {
            pngDatStr += String.fromCharCode(pngData[i]);
        }
        img.src = "data:image/png;base64," + btoa(pngDatStr);
    }
})

appControls.export(async(pngName) => {
    const renderResult = createImage();
    const pngData = await (await toBlob(renderResult)).arrayBuffer();

    var metadata = `img=${pngName}\n`;

    var sorted = [...images];
    sorted.sort((a, b) => a.id - b.id);

    for (let img of sorted) {
        metadata += `id=${img.id}\n`;
        metadata += `x=${img.x}\ny=${img.y}\nw=${img.width}\nh=${img.height}\n\n`;
    }

    console.log(metadata);

    return {
        image: pngData,
        meta: metadata 
    };
})

appControls.resize(() => {
    const extents = getExtents(images);

    canvasWidth = extents.right - extents.left;
    canvasHeight = extents.bottom - extents.top;
    draw();
});

appControls.format(async() => {
    isPrompt = true;
    const cols = await numberPrompt("Columns:", 8, 1, 900);
    isPrompt = false;

    if (!cols) return;

    const extents = getExtents(selectedImages);

    // sort images by their id
    var sorted = [...selectedImages];
    sorted.sort((a, b) => a.id - b.id);

    var x = extents.left;
    var y = extents.top;
    var col = 0;

    for (let img of sorted) {
        img.x = x;
        img.y = y;
        
        col++;

        if (col >= cols) {
            x = extents.left;
            y += img.height;
            col = 0;
        } else {
            x += img.width;
        }
    }

    draw();
});

appControls.id(async () => {
    let id = parseInt(await numberPrompt("enter id"));

    for (let img of images) {
        if (img.id === id && !selectedImages.includes(img)) {
            alert("id taken");
            return;
        }
    }

    if (Number.isInteger(id)) {
        var sorted = [...selectedImages]
        sorted.sort((a, b) => a.id - b.id);

        for (let img of sorted) {
            img.id = id++; 
        }
        draw();
    }
})