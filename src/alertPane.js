import React from 'react';

// must put a button with attribute 'data-dismiss="modal"'
export default function AlertPane(props) {
    return (
        <div className="modal fade" id="alertModal" tabindex="-1" role="dialog" aria-labelledby="alertModalLabel" aria-hidden="false" data-show="true">
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="alertModalLabel">{props.title}</h4>
                    </div>
                    <div className="modal-body">
                        {props.bodyElement}
                    </div>
                    <div className="modal-footer">
                        {props.footerElement}
                    </div>
                </div>
            </div>
        </div>
    );
}