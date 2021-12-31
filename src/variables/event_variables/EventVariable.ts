import {ShellCommandVariable} from "../ShellCommandVariable";
import ShellCommandsPlugin from "../../main";
import {SC_Event} from "../../events/SC_Event";
import {getSC_Event} from "../../events/SC_EventList";

export abstract class EventVariable extends ShellCommandVariable {
    /**
     * If sc_event is not set, then the variable is tried to be read in a situation where no event has happened - which should be denied.
     * @protected
     */
    protected sc_event?: SC_Event;

    protected abstract supported_sc_events: typeof SC_Event[];

    public constructor(plugin: ShellCommandsPlugin, shell: string, sc_event: SC_Event) {
        super(plugin, shell);
        this.sc_event = sc_event;
    }

    /**
     * Every subclass should call this method in their generateValue() before returning a value. If this method returns false,
     * then a variable should not generate a value, as the dependent SC_Event is unavailable.
     *
     * TODO: Change the error system to throw exceptions instead of relying on return values.
     *
     * @protected
     */
    protected checkSC_EventSupport(): boolean{
        // 1. Check generally that an event is happening.
        if (!this.sc_event) {
            this.newErrorMessage("This variable can only be used during events. " + this.getSummaryOfSupportedEvents());
            return false;
        }

        // 2. Check particularly which event it is.
        if (!this.supportsSC_Event(this.sc_event.getClass())) {
            this.newErrorMessage("This variable does not support event '" + this.sc_event.getTitle() + "'. " + this.getSummaryOfSupportedEvents());
            return false;
        }
        return true;
    }

    public supportsSC_Event(sc_event_class: typeof SC_Event): boolean {
        return this.supported_sc_events.contains(sc_event_class);
    }

    private getSummaryOfSupportedEvents(): string {
        const sc_event_titles: string[] = [];
        this.supported_sc_events.forEach((sc_event_class: typeof SC_Event) => {
            sc_event_titles.push(getSC_Event(this.plugin,sc_event_class).getTitle());
        });
        return "Supported events: " + sc_event_titles.join(", ");
    }
}