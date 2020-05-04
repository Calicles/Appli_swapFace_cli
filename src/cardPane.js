import React from 'react';

export default function CardPane(props) {
    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">{props.title}</h5>
                <div>
                    {props.bodyElement}
                </div>
                <div>
                    {props.footerElement}
                </div>
            </div>
        </div>
    );
}