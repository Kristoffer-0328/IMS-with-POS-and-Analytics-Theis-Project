document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        document.getElementById("splash-screen").style.display = "none";
        document.getElementById("main-content").classList.remove("hidden");
    }, 3000);
});
