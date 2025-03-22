import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-textfield/mwc-textfield";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type { HomeAssistant } from "../../../../types";

import type { EntityRegistryStateEntry } from "../ha-config-device-page";

import type {
  MatterNodeBinding,
  MatterNodeDiagnostics,
} from "../../../../data/matter";

import { setMatterNodeBinding } from "../../../../data/matter";

declare global {
  interface HTMLElementEventMap {
    "node-binding-changed": CustomEvent<{
      nodeBinding: MatterNodeBinding[];
      nodeDiagnostics: MatterNodeDiagnostics;
    }>;
  }
}

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

  // @state()
  // private _nodeDiagnostics?: MatterNodeDiagnostics;

  handleDeleteClickCallback(event: Event) {
    const button = event.target as HTMLElement;
    const index = Number(button.dataset.index);

    if (this.bindings) {
      const endpoint = this.bindings[index].endpoint;
      const device_id = this.entities[0].device_id;

      // remove data
      this.bindings?.splice(index, 1);

      // send to device
      setMatterNodeBinding(this.hass, device_id!, endpoint, this.bindings);
    }
    this.requestUpdate();
  }

  private _bindingsAdd(_ev: Event): void {
    const nodeBinding: MatterNodeBinding = {
      node: 1,
      endpoint: 2,
      group: 0,
      cluster: 0,
      fabricIndex: 2,
    };
    this.bindings?.push(nodeBinding);
    this.requestUpdate();
  }

  private _handleNodeBindingChanged(
    event: CustomEvent<{
      nodeBinding: MatterNodeBinding[];
      nodeDiagnostics: MatterNodeDiagnostics;
    }>
  ) {
    if (event.detail.nodeBinding) {
      this.bindings = event.detail.nodeBinding;
    }

    // if(event.detail.nodeDiagnostics){
    //     this._nodeDiagnostics = event.detail.nodeDiagnostics;
    // }

    this.showHidden = true;
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
                      <div class="grid-container">
                        <mwc-list-item>
                          <mwc-textfield
                            .value=${String(device.node)}
                          ></mwc-textfield>
                          <mwc-textfield
                            .value=${String(device.endpoint)}
                          ></mwc-textfield>
                        </mwc-list-item>
                        <mwc-button
                          label="delete"
                          data-index=${index}
                          @click=${this.handleDeleteClickCallback}
                        ></mwc-button>
                      </div>
                    `
                  )}
                </mwc-list>
              </div>
            `
          : nothing}

        <div class="grid-container">
          <div class="outlined-container">
            <span class="outlined-text">source</span>
            <div class="grid-container">
              <mwc-textfield
                id="tx_source_binding_endpoint_id"
                outlined
                label="endpoint id"
              ></mwc-textfield>
            </div>
          </div>

          <div class="outlined-container">
            <span class="outlined-text">target</span>
            <div class="grid-container">
              <mwc-textfield
                id="tx_target_binding_node_id"
                outlined
                label="node id"
              ></mwc-textfield>
              <mwc-textfield
                id="tx_target_binding_endpoint_id"
                outlined
                label="endpoint id"
              ></mwc-textfield>
            </div>
          </div>

          <mwc-button @click=${this._bindingsAdd}>
            ${this.hass.localize(
              "ui.panel.config.devices.entities.binding.add"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
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

    .grid-container {
      display: flex;
      grid-template-columns: repeat(
        auto-fit,
        minmax(100px, 1fr)
      ); /* 自动调整列宽 */
      gap: 10px; /* 设置元素之间的间距 */
    }

    .outlined-container {
      position: relative;
      outline: 2px solid #ccc;
      border-radius: 8px;
      padding: 12px;
      margin-top: 20px; /* 为标题留出空间 */
    }

    .outlined-text {
      position: absolute;
      top: -12px; /* 调整文本位置 */
      left: 16px; /* 调整文本位置 */
      background: white; /* 背景色覆盖边框 */
      padding: 0 8px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }

    .outlined-label {
      position: absolute;
      top: -12px; /* 调整文本位置 */
      left: 16px; /* 调整文本位置 */
      background: white; /* 背景色覆盖边框 */
      padding: 0 8px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-binding-card": HaDeviceBindingCard;
  }
}
