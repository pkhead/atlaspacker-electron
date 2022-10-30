function numberPrompt(question, value, min, max) {
    console.log("open prompt");

    var box = document.createElement("div");
    box.className = "prompt-box";
    document.body.appendChild(box);

    var title = document.createElement("span");
    title.textContent = question;
    box.appendChild(title);

    box.appendChild(document.createElement("br"));

    var input = document.createElement("input");
    input.type = "number";
    if (value !== undefined) input.value = value;
    if (min !== undefined) input.min = min;
    if (max !== undefined) input.max = max;
    input.style = "width:60px";
    box.appendChild(input);

    box.appendChild(document.createElement("br"));
    box.appendChild(document.createElement("br"));

    var okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.className = "default";
    box.appendChild(okButton);

    var cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    box.appendChild(cancelButton);

    box.style.left = `${window.innerWidth/2 - box.offsetWidth/2}px`;
    box.style.top = `${window.innerHeight/2 - box.offsetHeight/2}px`;
    input.focus();

    return new Promise((resolve, reject) => {
        input.addEventListener("keydown", (ev) => {
            if (ev.code === "Enter") {
                okButton.click();
            }
        });
        
        okButton.onclick = () => {
            box.remove();
            resolve(input.value);
        };

        cancelButton.onclick = () => {
            box.remove();
            resolve(null);
        }
    });
}

export { numberPrompt }