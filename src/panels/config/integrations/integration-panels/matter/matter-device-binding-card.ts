import { mdiDevices, mdiPlusCircle } from "@mdi/js";

import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import memoizeOne from "memoize-one";

import "../../../../../components/ha-card";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-button";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-selector/ha-selector";
import { showMatterNodeBindingDialog } from "./show-dialog-matter-node-binding";
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  getMatterNodeBinding,
  setMatterNodeBinding,
} from "../../../../../data/matter";

import { ASSIST_ENTITIES, SENSOR_ENTITIES } from "../../../../../common/const";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { groupBy } from "../../../../../common/util/group-by";

import { MatterDeviceMapper } from "./matter-binding-node-device-mapper";
import type { HaSelect } from "../../../../../components/ha-select";
import type { HomeAssistant } from "../../../../../types";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../../../../../data/entity_registry";
import type { MatterNodeBinding } from "../../../../../data/matter";
import type { EntityRegistryStateEntry } from "../../../devices/ha-config-device-page";

export interface ItemSelectedEvent {
  target?: HaSelect;
  value?: string;
  index?: number;
}

export const getDeviceControlsState = (
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): HassEntity | undefined => {
  if (!device) return undefined;

  // Helper function to find the first matching entity
  const findEntity = (
    predicate: (entity: EntityRegistryDisplayEntry) => boolean
  ): HassEntity | undefined => {
    const entity = Object.values(hass.entities).find(predicate);
    return entity ? hass.states[entity.entity_id] : undefined;
  };

  // Try to find a control entity (no category)
  const controlState = findEntity(
    (entity: EntityRegistryDisplayEntry) =>
      entity.device_id === device.id && entity.entity_category === undefined
  );
  if (controlState) return controlState;

  // Fallback to config "Identify" entity
  return findEntity(
    (entity: EntityRegistryDisplayEntry) =>
      entity.device_id === device.id &&
      entity.entity_category === "config" &&
      entity.name === "Identify"
  );
};

declare global {
  interface HTMLElementEventMap {
    "binding-updated": CustomEvent<Record<string, MatterNodeBinding[]>>;
  }
}

@customElement("matter-device-binding-card")
export class MatterDeviceBindingCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ attribute: false }) public entities!: EntityRegistryEntry[];

  @property({ type: Boolean, reflect: true }) outlined = false;

  @state()
  public showHidden = false;

  @property({ attribute: false })
  public bindings?: Record<string, MatterNodeBinding[]>;

  @state()
  private deviceMapper?: MatterDeviceMapper;

  private async _deleteBinding(
    endpoint: string,
    index: number
  ): Promise<boolean> {
    const bindings = this.bindings![endpoint];
    if (!bindings) return false;

    bindings.splice(index, 1);
    const ret = await setMatterNodeBinding(
      this.hass,
      this.device.id,
      Number(endpoint),
      bindings
    );

    return ret[0].Status === 0;
  }

  async handleDeleteClickCallback(event: Event) {
    try {
      const button = event.target as HTMLElement;
      const index = Number(button.dataset.index);
      const source_endpoint = button.dataset.endpoint!;

      const success = await this._deleteBinding(source_endpoint, index);
      if (success) {
        this.bindings![source_endpoint].splice(index, 1);
        this.requestUpdate();
      } else {
        throw new Error("Failed to delete binding");
      }
    } catch (_error) {
      fireEvent(this, "hass-notification", {
        message: "Failed to delete binding",
      });
    }
  }

  private _onDialogUpdate = async (
    source_endpoint: number,
    bindings: Record<string, MatterNodeBinding[]>
  ) => {
    try {
      const ret = await setMatterNodeBinding(
        this.hass,
        this.device.id,
        source_endpoint,
        bindings[source_endpoint]
      );
      if (ret[0].Status === 0) {
        this.bindings![source_endpoint] = bindings[source_endpoint];
        this.requestUpdate();
      }
    } catch (_err) {
      // eslint-disable-next-line no-console
      console.log("matter:", _err);
    }
  };

  async handleAddClickCallback(_ev: Event): Promise<any> {
    showMatterNodeBindingDialog(this, {
      device_id: this.device.id,
      bindings: this.bindings!,
      onUpdate: this._onDialogUpdate,
      deviceMapper: this.deviceMapper!,
      entities: this.entities,
    });
  }

  private async _fetchBindingForMatterDevice(): Promise<void> {
    if (this.hass) {
      try {
        this.bindings = await getMatterNodeBinding(this.hass, this.device.id!);
      } catch (_err) {
        // eslint-disable-next-line no-console
        console.log("matter:", _err);
        return;
      }
      if (Object.values(this.bindings!).some((value) => Array.isArray(value))) {
        this.showHidden = true;
      }
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("hass")) {
      this._fetchBindingForMatterDevice();
      this.deviceMapper = new MatterDeviceMapper(this.hass);
    }
  }

  protected getDeviceByNodeId(nodeId: number) {
    if (this.deviceMapper) {
      const deviceId = this.deviceMapper!.getDeviceIdByNodeId(String(nodeId));
      if (deviceId) {
        const device = this.hass.devices![deviceId!];
        if (device) {
          return device;
        }
      }
    }
    return undefined;
  }

  private _entitiesByCategory = memoizeOne(
    (entities: EntityRegistryEntry[]) => {
      const result = groupBy(entities, (entry) => {
        const domain = computeDomain(entry.entity_id);

        if (ASSIST_ENTITIES.includes(domain)) {
          return "assist";
        }

        if (domain === "event" || domain === "notify") {
          return domain;
        }

        if (entry.entity_category) {
          return entry.entity_category;
        }

        if (SENSOR_ENTITIES.includes(domain)) {
          return "sensor";
        }

        return "control";
      }) as Record<
        | "control"
        | "event"
        | "sensor"
        | "assist"
        | "notify"
        | NonNullable<EntityRegistryEntry["entity_category"]>,
        EntityRegistryStateEntry[]
      >;
      for (const key of [
        "assist",
        "config",
        "control",
        "diagnostic",
        "event",
        "notify",
        "sensor",
      ]) {
        if (!(key in result)) {
          result[key] = [];
        }
      }

      return result;
    }
  );

  private _getEntityByNodeInfo(
    nodeItem: MatterNodeBinding,
    entities: EntityRegistryEntry[]
  ) {
    return Object.values(entities).find((entity) => {
      const device_id = this.deviceMapper?.getDeviceIdByNodeId(
        String(nodeItem.node)
      );
      return (
        entity.device_id === device_id &&
        String(nodeItem.endpoint) === entity.unique_id.split("-")[3]
      );
    });
  }

  protected render(): TemplateResult {
    if (!this.showHidden) {
      return html`<p></p>`;
    }

    const matterEntities = Object.values(this.entities).filter(
      (entity) =>
        entity.platform === "matter" && entity.device_id !== this.device.id
    );
    const entitiesByCategory = this._entitiesByCategory(matterEntities);

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          Binding
          <ha-icon-button
            .path=${mdiPlusCircle}
            @click=${this.handleAddClickCallback}
          >
          </ha-icon-button>
        </h1>
        <main class="card-content">
          ${this.bindings
            ? Object.entries(this.bindings).map(([key, value]) =>
                value.length > 0
                  ? html`
                      <div class="sub-card">
                        <div class="sub-card-header">
                          <div>endpoint:</div>
                          <div>${key}</div>
                        </div>
                        ${value.map(
                          (nodeItem, index) => html`
                            <section class="binding-row">
                              <ha-list-item twoline graphic="icon">
                                ${(() => {
                                  const entity = this._getEntityByNodeInfo(
                                    nodeItem,
                                    entitiesByCategory.control
                                  );
                                  return entity
                                    ? html`
                                        <span>
                                          ${this.hass.states[entity.entity_id]
                                            .attributes.friendly_name}
                                        </span>
                                        <span slot="secondary"
                                          >${entity.entity_id}</span
                                        >
                                        <ha-state-icon
                                          slot="graphic"
                                          .hass=${this.hass}
                                          .stateObj=${this.hass.states[
                                            entity.entity_id
                                          ]}
                                        ></ha-state-icon>
                                      `
                                    : html`
                                        <span>
                                          ${"unKonwn node: " + nodeItem.node}
                                        </span>
                                        <span slot="secondary">unKonw</span>
                                        <ha-svg-icon
                                          slot="graphic"
                                          .path=${mdiDevices}
                                        ></ha-svg-icon>
                                      `;
                                })()}
                              </ha-list-item>

                              <ha-button
                                class="binding-button"
                                data-endpoint=${key}
                                data-index=${index}
                                label="delete"
                                @click=${this.handleDeleteClickCallback}
                              ></ha-button>
                            </section>
                          `
                        )}
                      </div>
                    `
                  : nothing
              )
            : nothing}
        </main>
      </ha-card>
    `;
  }

  static styles = css`
    :host([outlined]) {
      box-shadow: none;
      border-width: 1px;
      border-style: solid;
      border-color: var(--outline-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
    }

    .sub-card-header {
      display: flex;
      font-size: 20px;
      padding: 10px;
      gap: 20px;
      align-items: center;
    }

    .card-header ha-icon-button {
      margin-right: -8px;
      margin-inline-end: -8px;
      margin-inline-start: initial;
      color: var(--primary-color);
      height: auto;
      direction: var(--direction);
    }

    .sub-card {
      box-shadow: none;
      border-width: 1px;
      border-style: solid;
      border-color: var(--outline-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .card-content {
      display: grid;
      padding: 8px;
      gap: 5px;
    }

    .binding-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      padding-bottom: 8px;
    }

    .binding-row ha-list-item {
      flex: 0.7;
    }

    .binding-row ha-button {
      flex: 0.3;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-device-binding-card": MatterDeviceBindingCard;
  }
}
