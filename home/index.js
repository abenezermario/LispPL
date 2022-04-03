$(function () {
  if (!JOY.key()) {
    location.href = location.origin + "/";
  }

  // Type Writter
  class TypeWritter {
    constructor(txtElement, words, wait = 1000) {
      this.txtElement = txtElement;
      this.words = words;
      this.txt = "";
      this.wordIndex = 0;
      this.wait = parseInt(wait, 10);
      this.type();
      this.isDeleting = false;
    }
    endType() {
      clearTimeout(this.type);
    }

    type() {
      // Current index og word
      const current = this.wordIndex;
      console.log("current index: ", current);
      // Get full text of curret word
      const fullTxt = this.words[current];
      console.log("fullTxt: ", fullTxt);
      // Check if Deleting

      if (this.isDeleting) {
        // Remove char
        this.txt = fullTxt.substring(0, this.txt.length - 1);
      } else {
        // ADD char
        this.txt = fullTxt.substring(0, this.txt.length + 1);
      }

      // Insert txt into element
      this.txtElement.innerHTML = `<span class="txt">${this.txt}</span>`;
      // Init Type speed
      let typeSpeed = 200;
      if (this.isDeleting) {
        typeSpeed /= 2;
      }

      // If word is complete
      if (!this.isDeleting && this.txt === fullTxt) {
        if (this.wordIndex + 1 == this.words.length) {
          this.isDeleting = false;
          return;
        }
        // Make pause at end
        typeSpeed = this.wait;
        // Set delete to true
        this.isDeleting = true;
      } else if (this.isDeleting && this.txt === "") {
        this.isDeleting = false;
        // Move to next word
        console.log("endWordIndex: ", this.wordIndex);
        this.wordIndex++;
        // Pause before start typing
        typeSpeed = 300;
      }
      wave(this.txt).play();

      setTimeout(() => this.type(), typeSpeed); //
    }
  }

  // Init On DOM Load
  //   document.addEventListener("DOMContentLoaded", init);
  // Init APP
  async function init() {
    let seenHomeScreen = await gun.user().get("profile").get("seenHomeScreen");
    // if (!seenHomeScreen) {
    //   const username = await gun.user().get("profile").get("name");

    //   const words = ["Hello, " + username + "!", "Welcome to my world!"];
    //   const txtElement = document.querySelector(".txt-type");
    //   // const words = JSON.parse(txtElement.getAttribute("data-words"));
    //   // Init Type Writter
    //   //   typeWritter(txtElement, 70);

    //   JOY.typeWritter(
    //     txtElement,
    //     words,
    //     function () {
    //       $("#commands").removeClass("hide");
    //       $(".menu-icon").children("i").addClass("fa-bounce");
    //       gun.user().get("profile").get("seenHomeScreen").put(true);
    //       console.log("ended");
    //       setTimeout(() => {
    //         $(".menu-icon").children("i").removeClass("fa-bounce");
    //       }, 3000);
    //     },
    //     {
    //       typeSpeed: 200,
    //       backSpeed: 100,
    //     }
    //   ).type();
    // } else {
    //   $("#commands").removeClass("hide");
    // }
    meta.edit({
      name: JOY.icon("right-from-bracket", "solid", "Q"),
      combo: ["Q"],
      on: (e) => {
        location.href = location.origin + "/";
        gun.user().leave();
        localStorage.getItem("user-key") && localStorage.removeItem("user-key");
        console.log("pressed H");
      },
    });
    var m = meta;
    m.text = { zws: "&#8203;" };
    $(document).on("click", function () {
      var tmp = $(".meta-on");
      if (!tmp.length) {
        return;
      }
      tmp.removeClass("meta-on");
    });

    m.text.on = function (eve) {
      var tmp;
      if ($((eve || {}).target).closest("#meta").length) {
        return;
      }

      m.text.range = null;
      if (!(m.text.copy() || "").trim()) {
        m.flip(false);
        m.list(m.text.it);
        return;
      }
      m.text.range = monotype((eve || {}).target);
    };
    m.text.copy = function (tmp) {
      return (
        ((tmp = window.getSelection) && tmp().toString()) ||
        ((tmp = document.selection) && tmp.createRange().text) ||
        ""
      );
    };
    $(document).on(
      "select contextmenu keyup mouseup",
      "textarea, input",
      m.text.on
    );
    m.text.editor = function (opt, as) {
      var tmp;
      if (!opt) {
        return;
      }
      opt =
        typeof opt == "string" ? { edit: opt } : opt.tag ? opt : { tag: opt };
      var r = (opt.range = opt.range || m.text.range || monotype()),
        cmd = opt.edit;
      as = opt.as = opt.as || as;
      if (cmd && document.execCommand) {
        r.restore();
        if (document.execCommand(cmd, null, as || null)) {
          if (m.text.range) {
            m.text.range = monotype();
          }
          return;
        }
      }
      if (!opt.tag) {
        return;
      }
      opt.tag = $(opt.tag);
      opt.name = opt.name || opt.tag.prop("tagName");
      if ((tmp = $(r.get()).closest(opt.name)).length) {
        if (r.s === r.e) {
          tmp.after(m.text.zws);
          r = r.select(monotype.next(tmp[0]), 1);
        } else {
          tmp.contents().unwrap(opt.name);
        }
      } else if (r.s === r.e) {
        r.insert(opt.tag);
        r = r.select(opt.tag);
      } else {
        r.wrap(opt.tag);
      }
      r.restore();
      opt.range = null;
      if (m.text.range) {
        m.text.range = monotype();
      }
    };
    meta.edit(
      (meta.text.it = {
        combo: [-1],
        on: function () {
          m.list(this, true);
          // console.log(m.list);
        },
        back: meta.edit,
      })
    ); // -1 is key for typing.
    meta.edit({
      combo: [16],
      on: async function (e) {
        $(".key-none").toggle();
      },
    });
    meta.edit({
      combo: [-1, 16],
      on: async function (e) {
        $(".key-none").toggle();
      },
    });
    meta.text.it[-1] = meta.text.it;
    var __EVAL = (s) => eval(`void (__EVAL = ${__EVAL}); ${s}`);

    meta.edit({
      name: JOY.icon("right-from-bracket", "solid", "Enter"),
      combo: [-1, 13],
      on: (e) => {
        var c = window.code_editor.getValue();
        runCode(c);
        // alert(window.code_editor.getValue());
      },
    });
    (function () {
      window.requestAnimationFrame = window.requestAnimationFrame || setTimeout;
      window.requestAnimationFrame(function frame() {
        window.requestAnimationFrame(frame, 16);
      }, 16);
    })();
  }
  init();
});
/*
	Edit
		Bold
		Italic
		Link
		?
			Left
			Middle
			Right
			Justify
		?
			Small
			Normal
			Header
			Title
	Design
		Add
			Row
			Column
			Text
			Delete
		Turn
		Grab
		Size
			X
			Y
		Fill
	Logic
		Symbol
		Action
		Data
*/
