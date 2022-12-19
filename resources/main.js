//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { title: "", events: [] };

    /**
     * @typedef {{fileName: string, lineNumber: number, value: string, current: boolean, frame: string}} TimelineEvent - timeline event
     */


    /** @type {Array<TimelineEvent>} */
    let events = oldState.events || [];
    let title = oldState.title || "";

    renderEvents(title, events);

    // document.querySelector('.add-color-button')?.addEventListener('click', () => {
    //     addColor();
    // });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'setTimeline':
                {
                    events = message.events;
                    title = message.title;
                    renderEvents(title, events);
                    break;
                }
            case 'clear':
                {
                    events = [];
                    title = "";
                    renderEvents(title, events);
                    break;
                }
        }
    });

    
    /**
     * @param {string} element
     * @param {string} cls
     * @param {(Node|string)[]} children
     */
    function createElement(element, cls, ...children) {
        const el = document.createElement(element);
        el.className = cls;
        el.append(...children)
        return el;
    }

    /**
     * @param {string} cls
     * @param {(Node|string)[]} children
     */
    function rdiv(cls, ...children) {
        return createElement('div', cls, ...children);
    }

    /**
     * @param {string} cls
     * @param {(Node|string)[]} children
     */
    function rspan(cls, ...children) {
        return createElement('span', cls, ...children);
    }

    /**
     * @param {TimelineEvent} ev
     */
    function renderTimelineEvent(ev) {
        /*
        <li class="timeline-entry">
            <div class="guide"></div>
            <div class="content">
                <div class="file">capture.py <span class="line">line 20</></div>
                <div class="value">Value Modified</div>
            </div>
        </li>
        */
        let content = undefined;
        const li = createElement('li', 'timeline-entry',
            rdiv('guide'),
            content = rdiv(ev.current ? 'content current' : 'content',
                rdiv('file',
                    ev.fileName,
                    rspan('line', `line ${ev.lineNumber}`)
                ),
                rdiv('value', ev.value)
            ),
        );

        content.addEventListener('click', ()=> {
            document.querySelectorAll('.timeline-entry .content').forEach(e=>e.className = 'content');
            content.className = 'content current';
            onColorClicked(ev.frame)
        });

        return li;
    }

    /**
     * @param {string | null} title
     * @param {Array<TimelineEvent>} events
     */
    function renderEvents(title, events) {
        const ul = document.querySelector('.timeline-list');
        if (!ul) {
            return;
        }
        ul.textContent = '';

        for (const event of events) {
            const li = renderTimelineEvent(event);
            ul.appendChild(li);
        }

        const obj = document.querySelector('.obj');
        if (obj) {
            obj.textContent = title;
        }

        // Update the saved state
        vscode.setState({ title, events });
    }

    /** 
     * @param {string} frame 
     */
    function onColorClicked(frame) {
        vscode.postMessage({ type: 'frameSelected', value: frame });
    }
}());
