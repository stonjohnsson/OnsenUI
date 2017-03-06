import Vue from 'vue';
import { eventToHandler } from '../internal/util';

/* Private */
const _handlerToProp = name => name.slice(2).charAt(0).toLowerCase() + name.slice(2).slice(1);

const _setupDBB = component => {
  const dbb = 'onDeviceBackButton';
  // Call original handler or parent handler by default
  const handler = (component.$el[dbb] && component.$el[dbb]._callback) || (e => e.callParentHandler());

  component.$el[dbb] = event => {
    const id = setTimeout(handler.bind(component.$el, event), 0);
    component.$emit(_handlerToProp(dbb), {
      ...event,
      preventDefault: () => clearTimeout(id)
    });
  };

  component._isDBBSetup = true;
};

/* Public */
// Device Back Button Handler
const deriveDBB = {
  mounted() {
    _setupDBB(this);
  },

  // Core destroys deviceBackButton handlers on disconnectedCallback.
  // This fixes the behavior for <keep-alive> component.
  activated() {
    this._isDBBSetup === false && _setupDBB(this);
  },

  deactivated() {
    this._isDBBSetup === true && (this._isDBBSetup = false);
  }
};

// These handlers cannot throw events for performance reasons.
const deriveHandler = handlerName => {
  const propName = _handlerToProp(handlerName);

  return {
    props: {
      [propName]: {
        type: Function,
        default: null
      }
    },

    watch: {
      [propName]() {
        this.$el[handlerName] = this[propName];
      }
    },

    mounted() {
      this[propName] && (this.$el[handlerName] = this[propName]);
    }
  };
};

const deriveEvents = {
  mounted() {
    this._handlers = {};
    this._boundEvents = this.$el.constructor.__proto__.events || [];

    this._boundEvents.forEach(key => {
      this._handlers[eventToHandler(key)] = event => {
        // Filter events from different components with the same name
        if (event.target === this.$el || !/^ons-/i.test(event.target.tagName)) {
          this.$emit(key, event);
        }
      };
      this.$el.addEventListener(key, this._handlers[eventToHandler(key)]);
    });
  },

  beforeDestroy() {
    this._boundEvents.forEach(key => {
      this.$el.removeEventListener(key, this._handlers[eventToHandler(key)]);
    });
    this._handlers = this._boundEvents = null;
  }
};

export { deriveDBB, deriveHandler, deriveEvents };
