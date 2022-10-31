# atlaspacker
 crappy electron atlas packer

 no change history yet

# installation
 prerequisites:
 - [electron](https://www.electronjs.org/)
 - [nodejs/npm](https://nodejs.org/en/)

 run `npm install`

 after that, run `electron .` to launch the app

# .atlas file format
 file format of .atlas files written as C-style structs
 ```c
 struct atlas_rect {
    uint32_t id;
    uint32_t x;
    uint32_t y;
    uint32_t w;
    uint32_t h;
    char name[]; // zero-terminated string
 };

 struct atlas_file {
    uint32_t image_size;
    uint8_t png_data[image_size];
    uint32_t num_rects;
    struct atlas_rect rects[num_rects];
 };
 ```
