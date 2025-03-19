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

  @state()
  private bindings!: MatterNodeBinding[];

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
                    (device) => html`
                      <div>
                        <mwc-list-item>
                          <div
                            style="display: flex; align-items: center; width: 100%;"
                          >
                            <ha-svg-icon
                              path="M5.12,5H18.87L17.93,4H5.93L5.12,5M20.54,5.23C20.83,5.57 21,6 21,6.5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V6.5C3,6 3.17,5.57 3.46,5.23L4.84,3.55C5.12,3.21 5.53,3 6,3H18C18.47,3 18.88,3.21 19.15,3.55L20.54,5.23M6,18H12V15H6V18Z"
                            ></ha-svg-icon>
                            <span style="flex-grow: 1; text-align: center;">
                              ${device.node_id + "/" + device.endpoint_id}
                            </span>
                            <mwc-button style="margin-left: auto;">
                              ${this.hass.localize(
                                "ui.panel.config.devices.entities.binding.delete"
                              )}
                            </mwc-button>
                          </div>
                        </mwc-list-item>
                      </div>
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
    // console.log(ev);
  }

  private _bindingsDelete(_ev: Event): void {
    // console.log(ev);
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
