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
    if (!seenHomeScreen) {
      const username = await gun.user().get("profile").get("name");

      const words = ["Hello, " + username + "!", "Welcome to my world!"];
      const txtElement = document.querySelector(".txt-type");
      // const words = JSON.parse(txtElement.getAttribute("data-words"));
      const wait = txtElement.getAttribute("data-wait");
      // Init Type Writter
      //   typeWritter(txtElement, 70);

      JOY.typeWritter(
        txtElement,
        words,
        function () {
          $("#commands").removeClass("hide");
          $(".menu-icon").children("i").addClass("fa-bounce");
          gun.user().get("profile").get("seenHomeScreen").put(true);
          console.log("ended");
          setTimeout(() => {
            $(".menu-icon").children("i").removeClass("fa-bounce");
          }, 3000);
        },
        {
          typeSpeed: 200,
          backSpeed: 100,
        }
      ).type();
    } else {
      $("#commands").removeClass("hide");
    }
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
