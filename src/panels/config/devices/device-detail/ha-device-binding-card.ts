import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-textfield/mwc-textfield";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, queryAll } from "lit/decorators";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type { TextField } from "@material/mwc-textfield/mwc-textfield";
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
      nodeBinding: {};
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
  public showHidden = true;

  @property({ attribute: false })
  public bindings?: Record<string, MatterNodeBinding[]>;

  @queryAll(".bindingTarget")
  private bindingTargetTextFiled!: NodeListOf<TextField>;

  async handleDeleteClickCallback(event: Event) {
    const button = event.target as HTMLElement;
    const index = Number(button.dataset.index);
    const endpoint = button.dataset.endpoint!;
    const bindings = this.bindings![endpoint];

    if (bindings) {
      const device_id = this.entities[0].device_id;
      // remove data
      bindings.splice(index, 1);
      // send to device
      const ret = await setMatterNodeBinding(
        this.hass,
        device_id!,
        Number(endpoint),
        bindings
      );

      if (ret[0].Status === 0) {
        this.bindings![endpoint].splice(index, 1);
        this.requestUpdate();
      }
    }
  }

  async handleAddClickCallback(_ev: Event): Promise<any> {
    if (this.bindings) {
      const source_endpoint_id = this.bindingTargetTextFiled[0].value;
      const target_node_id = this.bindingTargetTextFiled[1].value;
      const target_endpoint_id = this.bindingTargetTextFiled[2].value;

      const endpoint = Number(source_endpoint_id);
      const device_id = this.entities[0].device_id;
      const bindings = this.bindings![endpoint];

      const nodeBinding: MatterNodeBinding = {
        node: Number(target_node_id),
        endpoint: Number(target_endpoint_id),
        group: null,
        cluster: null,
        fabricIndex: null,
      };

      const ret = await setMatterNodeBinding(
        this.hass,
        device_id!,
        endpoint,
        bindings
      );
      if (ret[0].Status === 0) {
        this.bindings[source_endpoint_id].push(nodeBinding);
        this.requestUpdate();
      }
    }
  }

  private _handleNodeBindingChanged(
    event: CustomEvent<{
      nodeBinding: Record<string, MatterNodeBinding[]>;
      nodeDiagnostics: MatterNodeDiagnostics;
    }>
  ) {
    if (event.detail.nodeBinding) {
      this.bindings = event.detail.nodeBinding;
    }
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

    return html`
      <ha-card .header=${this.header}>
        <div style="display:grid;padding:8px;gap:5px;">
          <div style="font-weight: bold;" class="header-row">
            <div style="flex:0.3">source endpoint</div>
            <div style="flex:0.4" class="grid-container">
              <div>target node</div>
              <div>target endpoint</div>
            </div>
            <div style="flex:0.3"></div>
          </div>

          ${this.bindings
            ? Object.entries(this.bindings).map(
                ([key, value]) => html`
                  ${value.map(
                    (nodeItem, index) => html`
                      <div class="header-row">
                        <div style="flex:0.3">${key}</div>
                        <div style="flex:0.4" class="grid-container">
                          <div>
                            ${nodeItem.node == null ? "null" : nodeItem.node}
                          </div>
                          <div>
                            ${nodeItem.endpoint == null
                              ? "null"
                              : nodeItem.endpoint}
                          </div>
                        </div>
                        <div style="flex:0.3">
                          <mwc-button
                            data-endpoint=${key}
                            data-index=${index}
                            label="delete"
                            @click=${this.handleDeleteClickCallback}
                          ></mwc-button>
                        </div>
                      </div>
                    `
                  )}
                `
              )
            : nothing}

          <div></div>

          <div class="grid-container">
            <mwc-textfield
              class="bindingTarget"
              outlined
              label="source endpoint"
            ></mwc-textfield>

            <mwc-textfield
              class="bindingTarget"
              outlined
              label="target node"
            ></mwc-textfield>

            <mwc-textfield
              class="bindingTarget"
              outlined
              label="target endpoint"
            ></mwc-textfield>

            <mwc-button @click=${this.handleAddClickCallback}>
              ${this.hass.localize(
                "ui.panel.config.devices.entities.binding.add"
              )}
            </mwc-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`

    .header-row {
      display: flex;
      padding: 2px;
      height: 30px;
      align-items:center;
      justify-content:center;
    }

    .header-row div {
      flex: 1;
    }

    .grid-container {
      display: flex;
    }

    div mwc-textfield {
      flex: 1;
      font-weight: bold;
      margin-right: 16px;
    }

    .grid-container mwc-textfield {
        height:36px;
}

    .outlined-container {
      position: relative;
      outline: 2px solid #ccc;
      border-radius: 8px;
      padding: 12px;
      margin-top: 24px; /* 为标题留出空间 */
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

    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-binding-card": HaDeviceBindingCard;
  }
}
