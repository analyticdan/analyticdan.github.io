const readMoreDict = { pathogen: false };

function onClickReadMore(id) {
  var body = document.getElementById("read-more__body--" + id);
  var headerText = document.getElementById("read-more__header-text--" + id);
  var headerIndicator = document.getElementById(
    "read-more__header-indicator--" + id
  );

  if (readMoreDict[id]) {
    body.style.display = "none";
    headerText.textContent = "Read More"
    headerIndicator.textContent = "+"
  } else {
    body.style.display = "block";
    headerText.textContent = "Collapse"
    headerIndicator.textContent = "-"
  }
  readMoreDict[id] = !readMoreDict[id];
}
