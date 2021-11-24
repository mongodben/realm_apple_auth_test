import React, { useContext, useState, useEffect, useRef } from "react";
import { appleAuthAndroid } from "@invertase/react-native-apple-authentication";
import Realm from "realm";
import app from "../realmApp";

// Create a new Context object that will be provided to descendants of
// the AuthProvider.
const AuthContext = React.createContext(null);

// The AuthProvider is responsible for user management and provides the
// AuthContext value to its descendants. Components under an AuthProvider can
// use the useAuth() hook to access the auth value.
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(app.currentUser);
  const realmRef = useRef(null);
  const [projectData, setProjectData] = useState([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // The current user always has their own project, so we don't need
    // to wait for the user object to load before displaying that project.
    const myProject = { name: "My Project", partition: `project=${user.id}` };
    setProjectData([myProject]);

    const config = {
      sync: {
        user,
        partitionValue: `user=${user.id}`,
      },
    };

    // Open a realm with the logged in user's partition value in order
    // to get the projects that the logged in user is a member of
    Realm.open(config).then((userRealm) => {
      realmRef.current = userRealm;
      const users = userRealm.objects("User");

      users.addListener(() => {
        // The user custom data object may not have been loaded on
        // the server side yet when a user is first registered.
        if (users.length === 0) {
          setProjectData([myProject]);
        } else {
          const { memberOf } = users[0];
          setProjectData([...memberOf]);
        }
      });
    });

    return () => {
      // cleanup function
      const userRealm = realmRef.current;
      if (userRealm) {
        userRealm.close();
        realmRef.current = null;
        setProjectData([]); // set project data to an empty array (this prevents the array from staying in state on logout)
      }
    };
  }, [user]);

  // The signIn function takes an email and password and uses the
  // emailPassword authentication provider to log in.
  const signIn = async (email, password) => {
    const creds = Realm.Credentials.emailPassword(email, password);
    const newUser = await app.logIn(creds);
    setUser(newUser);
  };

  // The signUp function takes an email and password and uses the
  // emailPassword authentication provider to register the user.
  const signUp = async (email, password) => {
    await app.emailPasswordAuth.registerUser({ email, password });
  };

  // The signOut function calls the logOut function on the currently
  // logged in user
  const signOut = () => {
    if (user == null) {
      console.warn("Not logged in, can't log out!");
      return;
    }
    user.logOut();
    setUser(null);
  };

  const logInApple = async () => {
    const rawNonce = "12345";
    const state = "let's see...";

    // Configure the request
    appleAuthAndroid.configure({
      // The Service ID you registered with Apple
      clientId: "com.mongodb.testingRealmServicesIdV2",

      // Return URL added to your Apple dev console. We intercept this redirect, but it must still match
      // the URL you provided to Apple. It can be an empty route on your backend as it's never called.
      redirectUri: "https://myapp-zufnj.mongodbstitch.com/auth.html",

      // The type of response requested - code, id_token, or both.
      responseType: appleAuthAndroid.ResponseType.ALL,

      // The amount of user information requested from Apple.
      scope: appleAuthAndroid.Scope.ALL,

      // Random nonce value that will be SHA256 hashed before sending to Apple.
      nonce: rawNonce,

      // Unique state value used to prevent CSRF attacks. A UUID will be generated if nothing is provided.
      state,
    });

    // Open the browser window for user sign in
    const response = await appleAuthAndroid.signIn();
    console.log("response is::", response);

    // Send the authorization code to your backend for verification
  };

  return (
    <AuthContext.Provider
      value={{
        signUp,
        signIn,
        signOut,
        logInApple,
        user,
        projectData, // list of projects the user is a memberOf
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// The useAuth hook can be used by components under an AuthProvider to
// access the auth context value.
const useAuth = () => {
  const auth = useContext(AuthContext);
  if (auth == null) {
    throw new Error("useAuth() called outside of a AuthProvider?");
  }
  return auth;
};

export { AuthProvider, useAuth };
