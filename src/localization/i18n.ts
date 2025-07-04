import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
	fallbackLng: "en",
	resources: {
		en: {
			translation: {
				appName: "Screen Recorder Medical",
				titleHomePage: "Home Page",
				titleSecondPage: "Second Page",
				titleScreenRecorder: "Screen Recorder",
			},
		},
		"pt-BR": {
			translation: {
				appName: "Screen Recorder Medical",
				titleHomePage: "Página Inicial",
				titleSecondPage: "Segunda Página",
				titleScreenRecorder: "Gravador de Tela",
			},
		},
	},
});
