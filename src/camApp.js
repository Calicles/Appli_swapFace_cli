import React from 'react';
import ProjectPage from '../projectPage.js';
import App from './app.js';

export default function CamApp(props) {
	const element = (
		<p>
			Application de face swapping réalisée pour ce cv.<br/>
			Repository github <a href="">ici</a>.<br/>
			Il s'agit d'échanger son visage avec celui du personnage de la photo.<br/>
			J'ai utilisé <a href="https://opencv.org/">opencv</a> pour tout les traitements d'image.<br/>
			Côté client, opencv a été compilé avec <a href="https://emscripten.org/">EMSCRIPTEN</a>,<br/>
			côté serveur, je l'ai utilisé avec la bilbiothèque <a href="http://dlib.net/">dlib</a>.

			J'ai spécialement développé un serveur d'application en c++ avec la bilbiothèque
			 <a href="https://github.com/microsoft/cpprestsdk">cpprestsdk</a>.<br/>
			Projet disponible <a href="https://github.com/Calicles/api_swapfaceserver">ici</a>
		</p>
	);
	const app = <App />;
	return (
		<div>
		<ProjectPage
			title="Computer Vision"
			text={element}	
			srcDiagrammeClasse="./resources/computerVision/diagrammeClasses.png"
			srcJsonClass="./resources/computerVision/classes.json"
			element={app}
		/>
		</div>
	);
}