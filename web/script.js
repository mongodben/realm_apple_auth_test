const Realm = window.Realm;

console.log(AppleID);
AppleID.auth.init({
  clientId: "com.mongodb.testingRealmServicesIdV2",
  scope: "name email",
  redirectURI: "https://myapp-zufnj.mongodbstitch.com/auth.html",
  state: "initial auth request",
  usePopup: true, //or false defaults to false
});

const app = new Realm.App({
  id: "myapp-zufnj",
});

const authButton = document.getElementById("apple-auth");
authButton.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    console.log("hola");
    const {
      authorization: { id_token },
    } = await AppleID.auth.signIn();

    const credentials = Realm.Credentials.apple(id_token);
    const user = await app.logIn(credentials);
    console.log(`Logged in with id: ${user.id}`);
  } catch (err) {
    console.error("error::", err);
  }
});
