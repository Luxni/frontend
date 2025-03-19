import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type { HomeAssistant } from "../../../../types";
import type { EntityRegistryStateEntry } from "../ha-config-device-page";
import type { MatterNodeBinding } from "../../../../data/matter";

@customElement("ha-device-binding-card")
export class HaDeviceBindingCard extends LitElement {
  @property() public header!: string;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entities!: EntityRegistryStateEntry[];

  @state()
  public showHidden = false;

  @property({ attribute: false })
  public bindings?: MatterNodeBinding[];

  private _handleNodeBindingChanged(event: CustomEvent<{ nodeBinding: [] }>) {
    if (event.detail.nodeBinding) {
      this.showHidden = true;
      this.bindings = event.detail.nodeBinding;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "node-binding-changed",
      this._handleNodeBindingChanged
    );
  }

  protected render(): TemplateResult {
    if (!this.showHidden) {
      return html`<p></p>`;
    }

    const bindings: MatterNodeBinding[] = [];

    if (this.bindings) {
      this.bindings.forEach((device) => {
        bindings.push(device);
      });
    }

    return html`
      <ha-card outlined .header=${this.header}>
        ${bindings.length
          ? html`
              <div id="entities" class="move-up">
                <mwc-list>
                  ${bindings.map(
                    (device, index) => html`
                      <mwc-list-item tabindex="0" data-index=${index}>
                        <div
                          style="display: flex; align-items: center; width: 100%;"
                        >
                          <ha-svg-icon>${index}</ha-svg-icon>
                          <span style="flex-grow: 1; text-align: center;">
                            ${device.node_id + "/" + device.endpoint_id}
                          </span>
                          <mwc-button
                            slot="end"
                            class="action-button"
                            data-index=${index}
                            style="margin-left: auto;"
                            @click=${this._bindingsDelete}
                          >
                            ${this.hass.localize(
                              "ui.panel.config.devices.entities.binding.delete"
                            )}
                          </mwc-button>
                        </div>
                      </mwc-list-item>
                    `
                  )}
                </mwc-list>
              </div>
            `
          : nothing}

        <div class="card-actions">
          <mwc-button @click=${this._bindingsAdd}>
            ${this.hass.localize(
              "ui.panel.config.devices.entities.binding.add"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private _bindingsAdd(_ev: Event): void {
    const nodeBinding: MatterNodeBinding = { node_id: 1, endpoint_id: 2 };
    this.bindings?.push(nodeBinding);
    this.requestUpdate();
  }

  private _bindingsDelete(_ev: Event): void {
    const button = _ev.currentTarget as HTMLElement;
    this.bindings?.splice(button.dataset.index, 1);
    this.requestUpdate();
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-icon {
      margin-left: -8px;
    }
    .entity-id {
      color: var(--secondary-text-color);
    }
    .buttons {
      text-align: right;
      margin: 0 0 0 8px;
    }
    .disabled-entry {
      color: var(--secondary-text-color);
    }
    .move-up {
      margin-top: -13px;
    }
    .move-up:has(> mwc-list) {
      margin-top: -24px;
    }
    :not(.move-up) > mwc-list {
      margin-top: -24px;
    }

    #entities > mwc-list {
      margin: 0 16px 0 8px;
    }
    #entities > ha-svg-icon {
      margin: 0;
    }

    ha-svg-icon {
      min-height: 40px;
      padding: 0 16px;
      cursor: pointer;
      --paper-item-icon-width: 48px;
    }
    .name {
      font-size: 14px;
    }

    ha-icon-button.show-more {
      color: var(--primary-color);
      text-align: left;
      cursor: pointer;
      background: none;
      border-width: initial;
      border-style: none;
      border-color: initial;
      border-image: initial;
      padding: 16px;
      font: inherit;
    }

    ha-icon-button.show-more:focus {
      outline: none;
      text-decoration: underline;
    }
    mwc-list > * {
      margin: 8px 0px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-binding-card": HaDeviceBindingCard;
  }
}
