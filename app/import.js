class DropImport {
    constructor(callback) {
      function dropHandler(ev) {
        ev.preventDefault();
        var files = [];
        
        console.log(ev.dataTransfer.items);
        for (let item of ev.dataTransfer.items) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            files.push(file);
          }
        }
      
        files.sort((a, b) => a.name.localeCompare(b.name));
      
        const fileReader = new FileReader();
      
        var file_i = 0;

        var images = [];
        
        fileReader.onload = () => {
          let img = new Image();

          img.onload = () => {
            images.push({data: img, name: files[file_i].name });
            
            // read next file
            if (++file_i < files.length) {
                fileReader.readAsDataURL(files[file_i]);
            } else {
                callback(images);
            }
          }

          img.src = fileReader.result;
        };

        if (file_i < files.length) {
            fileReader.readAsDataURL(files[file_i]);
        }
      }
  
      window.ondrop = dropHandler;
      window.ondragover = function(ev) {
        ev.preventDefault();
      };
    }
  }
  
  export { DropImport }