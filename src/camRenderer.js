import React from 'react';

export default class CamRenderer extends React.Component {
    constructor (props) {
        super(props);
        this.canvasId = props.canvasId;
        this.canvasWrapperClassNames = props.canvasWrapperClassNames;
        this.canvasClassNames = props.canvasClassNames;
        this.canvasWidht = props.canvasWidth;
        this.canvasHeight = props.canvasHeight;
        this.onEnter = props.onEnter;
        this.onExit = props.onExit;
    }

    componentDidMount() {
        if (this.onEnter) {
            this.onEnter();
        }
    }

    componentWillUnmount() {
        if (this.onExit) {
            this.onExit();
        }
    }

    render () {
        return (
            <div className={this.canvasWrapperClassNames}>
                <canvas id={this.canvasId} className={this.canvasClassNames} width={299} height={275}>Your browser does not support canvas tag</canvas>
            </div>
        );
    }
}